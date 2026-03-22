import express from "express";
import { Resend } from "resend";
import adminAuth from "../middleware/adminAuth.js";
import restaurantAuth from "../middleware/restaurantAuth.js";
import restaurantModel from "../models/restaurantModel.js";
import messageModel from "../models/messageModel.js";

const router     = express.Router();
const getResend  = () => new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = () => process.env.FROM_EMAIL || "onboarding@resend.dev";

function buildEmailHtml(restaurantName, subject, body, from) {
  const color = from === "admin" ? "#ff4e2a" : "#3b82f6";
  const sender = from === "admin" ? "Crave Platform" : restaurantName;
  return `<!DOCTYPE html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:${color};padding:24px 32px;">
      <p style="color:rgba(255,255,255,0.75);margin:0 0 4px;font-size:12px;">Message from ${sender}</p>
      <h1 style="color:white;margin:0;font-size:20px;font-weight:900;">${subject || "New message"}</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="color:#374151;font-size:15px;line-height:1.7;white-space:pre-line;margin:0;">${body}</p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;background:#fafafa;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Reply in your Crave admin panel to continue this conversation.</p>
    </div>
  </div>
</body></html>`;
}

// ── Admin: send message to one or all restaurants ─────────────────────────
router.post("/admin/send", adminAuth, async (req, res) => {
  try {
    const { restaurantId, subject, body, sendEmail } = req.body;
    if (!body) return res.json({ success: false, message: "Message body is required." });

    // Determine recipients
    let restaurants = [];
    if (restaurantId === "all") {
      restaurants = await restaurantModel.find({}).select("name email").lean();
    } else {
      const r = await restaurantModel.findById(restaurantId).select("name email").lean();
      if (!r) return res.json({ success: false, message: "Restaurant not found." });
      restaurants = [r];
    }

    // Save messages to DB
    const messages = restaurants.map(r => ({
      restaurantId: r._id,
      from: "admin",
      subject: subject || "",
      body,
      readByAdmin: true,
      readByRestaurant: false,
      sentByEmail: !!sendEmail,
    }));
    await messageModel.insertMany(messages);

    // Send emails if requested
    if (sendEmail) {
      const resend = getResend();
      const from = FROM_EMAIL();
      const BATCH = 10;
      for (let i = 0; i < restaurants.length; i += BATCH) {
        const batch = restaurants.slice(i, i + BATCH);
        await Promise.allSettled(batch.map(r =>
          resend.emails.send({
            from: `Crave Platform <${from}>`,
            to: r.email,
            subject: subject || "New message from Crave",
            html: buildEmailHtml(r.name, subject, body, "admin"),
          })
        ));
      }
    }

    res.json({
      success: true,
      message: `Message sent to ${restaurants.length} restaurant${restaurants.length !== 1 ? "s" : ""}${sendEmail ? " (+ email)" : ""}.`,
    });
  } catch (err) {
    console.error("[message/admin/send]", err);
    res.json({ success: false, message: "Failed to send message." });
  }
});

// ── Admin: get all conversations (one per restaurant) ─────────────────────
router.get("/admin/conversations", adminAuth, async (req, res) => {
  try {
    const restaurants = await restaurantModel.find({}).select("name logo").lean();
    const conversations = await Promise.all(restaurants.map(async r => {
      const last    = await messageModel.findOne({ restaurantId: r._id }).sort({ createdAt: -1 }).lean();
      const unread  = await messageModel.countDocuments({ restaurantId: r._id, from: "restaurant", readByAdmin: false });
      return { restaurant: r, lastMessage: last, unreadCount: unread };
    }));
    // Sort by latest message first, then restaurants with messages
    const sorted = conversations
      .filter(c => c.lastMessage)
      .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
    res.json({ success: true, conversations: sorted });
  } catch (err) {
    res.json({ success: false, message: "Failed to load conversations." });
  }
});

// ── Admin: get thread with a specific restaurant ───────────────────────────
router.get("/admin/thread/:restaurantId", adminAuth, async (req, res) => {
  try {
    const messages = await messageModel
      .find({ restaurantId: req.params.restaurantId })
      .sort({ createdAt: 1 })
      .lean();
    // Mark restaurant messages as read by admin
    await messageModel.updateMany(
      { restaurantId: req.params.restaurantId, from: "restaurant", readByAdmin: false },
      { readByAdmin: true }
    );
    res.json({ success: true, messages });
  } catch (err) {
    res.json({ success: false, message: "Failed to load thread." });
  }
});

// ── Admin: total unread count ──────────────────────────────────────────────
router.get("/admin/unread", adminAuth, async (req, res) => {
  try {
    const count = await messageModel.countDocuments({ from: "restaurant", readByAdmin: false });
    res.json({ success: true, count });
  } catch {
    res.json({ success: false, count: 0 });
  }
});

// ── Restaurant: get own thread ────────────────────────────────────────────
router.get("/restaurant/thread", restaurantAuth, async (req, res) => {
  try {
    const messages = await messageModel
      .find({ restaurantId: req.restaurantId })
      .sort({ createdAt: 1 })
      .lean();
    // Mark admin messages as read
    await messageModel.updateMany(
      { restaurantId: req.restaurantId, from: "admin", readByRestaurant: false },
      { readByRestaurant: true }
    );
    res.json({ success: true, messages });
  } catch (err) {
    res.json({ success: false, message: "Failed to load messages." });
  }
});

// ── Restaurant: send message to admin ────────────────────────────────────
router.post("/restaurant/send", restaurantAuth, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body) return res.json({ success: false, message: "Message body is required." });

    await messageModel.create({
      restaurantId: req.restaurantId,
      from: "restaurant",
      body,
      readByAdmin: false,
      readByRestaurant: true,
    });

    res.json({ success: true, message: "Message sent." });
  } catch (err) {
    res.json({ success: false, message: "Failed to send message." });
  }
});

// ── Restaurant: unread count ──────────────────────────────────────────────
router.get("/restaurant/unread", restaurantAuth, async (req, res) => {
  try {
    const count = await messageModel.countDocuments({
      restaurantId: req.restaurantId,
      from: "admin",
      readByRestaurant: false,
    });
    res.json({ success: true, count });
  } catch {
    res.json({ success: false, count: 0 });
  }
});

// ── Restaurant: toggle pin ────────────────────────────────────────────────
router.post("/restaurant/pin/:messageId", restaurantAuth, async (req, res) => {
  try {
    const msg = await messageModel.findOne({ _id: req.params.messageId, restaurantId: req.restaurantId });
    if (!msg) return res.json({ success: false, message: "Message not found." });
    msg.pinned = !msg.pinned;
    await msg.save();
    res.json({ success: true, pinned: msg.pinned });
  } catch {
    res.json({ success: false, message: "Failed to update." });
  }
});

// ── Restaurant: toggle favourite ─────────────────────────────────────────
router.post("/restaurant/favourite/:messageId", restaurantAuth, async (req, res) => {
  try {
    const msg = await messageModel.findOne({ _id: req.params.messageId, restaurantId: req.restaurantId });
    if (!msg) return res.json({ success: false, message: "Message not found." });
    msg.favourited = !msg.favourited;
    await msg.save();
    res.json({ success: true, favourited: msg.favourited });
  } catch {
    res.json({ success: false, message: "Failed to update." });
  }
});

export default router;