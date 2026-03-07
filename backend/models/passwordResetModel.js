import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "restaurant",
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    default: null,
  },
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const passwordResetModel =
  mongoose.models.passwordReset ||
  mongoose.model("passwordReset", passwordResetSchema);

export default passwordResetModel;