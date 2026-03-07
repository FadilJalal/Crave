import crypto from "crypto";
import bcrypt from "bcrypt";
import { Resend } from "resend";
import restaurantModel from "../models/restaurantModel.js";
import userModel from "../models/userModel.js";
import passwordResetModel from "../models/passwordResetModel.js";

const resend     = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@yourdomain.com";

async function sendResetEmail({ name, email, resetLink }) {
  await resend.emails.send({
    from: `Crave. <${FROM_EMAIL}>`,
    to: email,
    subject: "Reset your password — Crave.",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Inter, Arial, sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #ff4e2a, #ff6a3d); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-style: italic; font-weight: 900;">Crave.</h1>
          </div>
          <div style="padding: 36px 32px;">
            <h2 style="margin: 0 0 12px; color: #111827; font-size: 22px; font-weight: 800;">Reset your password</h2>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
              Hi <strong>${name}</strong>, click the button below to reset your password.
              This link expires in <strong>1 hour</strong>.
            </p>
            <a href="${resetLink}"
              style="display: block; text-align: center; background: linear-gradient(135deg, #ff4e2a, #ff6a3d);
                     color: white; text-decoration: none; padding: 14px 28px; border-radius: 50px;
                     font-weight: 800; font-size: 15px; margin-bottom: 24px;">
              Reset Password →
            </a>
            <p style="color: #9ca3af; font-size: 13px;">If you didn't request this, ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
            <p style="color: #d1d5db; font-size: 12px; margin: 0;">Or copy: <span style="color: #6b7280;">${resetLink}</span></p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// POST /api/auth/forgot-password
// Body: { email, type: "customer" | "restaurant" }
export const forgotPassword = async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email) return res.json({ success: false, message: "Email is required" });

    const FRONTEND_URL         = process.env.FRONTEND_URL         || "http://localhost:5174";
    const RESTAURANT_ADMIN_URL = process.env.RESTAURANT_ADMIN_URL || "http://localhost:5175";

    let record = null;
    let resetLink = "";
    let name = "";

    if (type === "restaurant") {
      record = await restaurantModel.findOne({ email: email.toLowerCase() });
      if (record) {
        name = record.name;
        await passwordResetModel.deleteMany({ restaurantId: record._id });
        const token = crypto.randomBytes(32).toString("hex");
        await passwordResetModel.create({
          restaurantId: record._id,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
        resetLink = `${RESTAURANT_ADMIN_URL}/reset-password?token=${token}&type=restaurant`;
      }
    } else {
      record = await userModel.findOne({ email: email.toLowerCase() });
      if (record) {
        name = record.name;
        await passwordResetModel.deleteMany({ userId: record._id });
        const token = crypto.randomBytes(32).toString("hex");
        await passwordResetModel.create({
          userId: record._id,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
        resetLink = `${FRONTEND_URL}/reset-password?token=${token}&type=customer`;
      }
    }

    if (record) {
      await sendResetEmail({ name, email: email.toLowerCase(), resetLink });
    }

    res.json({ success: true, message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.json({ success: false, message: "Failed to send reset email. Please try again." });
  }
};

// POST /api/auth/reset-password
// Body: { token, newPassword, type: "customer" | "restaurant" }
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, type } = req.body;

    if (!token)       return res.json({ success: false, message: "Reset token is required" });
    if (!newPassword) return res.json({ success: false, message: "New password is required" });
    if (newPassword.length < 6) return res.json({ success: false, message: "Password must be at least 6 characters" });

    const resetRecord = await passwordResetModel.findOne({ token });
    if (!resetRecord || new Date() > resetRecord.expiresAt) {
      if (resetRecord) await passwordResetModel.findByIdAndDelete(resetRecord._id);
      return res.json({ success: false, message: "Invalid or expired reset link. Please request a new one." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    if (type === "restaurant" && resetRecord.restaurantId) {
      await restaurantModel.findByIdAndUpdate(resetRecord.restaurantId, { password: hashed });
    } else if (resetRecord.userId) {
      await userModel.findByIdAndUpdate(resetRecord.userId, { password: hashed });
    } else {
      return res.json({ success: false, message: "Invalid reset token type." });
    }

    await passwordResetModel.findByIdAndDelete(resetRecord._id);
    res.json({ success: true, message: "Password reset successfully! You can now log in." });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.json({ success: false, message: "Failed to reset password. Please try again." });
  }
};

// GET /api/auth/verify-reset-token?token=xxx
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.json({ success: false, message: "Token is required" });

    const resetRecord = await passwordResetModel.findOne({ token });
    if (!resetRecord || new Date() > resetRecord.expiresAt) {
      return res.json({ success: false, message: "Invalid or expired reset link." });
    }

    res.json({ success: true, message: "Token is valid" });
  } catch (err) {
    res.json({ success: false, message: "Failed to verify token" });
  }
};