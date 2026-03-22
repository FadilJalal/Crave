import express from "express";
import { Resend } from "resend";
import adminAuth from "../middleware/adminAuth.js";
import restaurantModel from "../models/restaurantModel.js";

const router     = express.Router();
const getResend  = () => new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = () => process.env.FROM_EMAIL || "onboarding@resend.dev";

const TYPES = {
  announcement: { color: "#111827", label: "Announcement" },
  maintenance:  { color: "#f59e0b", label: "Maintenance"  },
  billing:      { color: "#3b82f6", label: "Billing"      },
  feature:      { color: "#8b5cf6", label: "New Feature"  },
};

// ── POST /api/broadcast/send ───────────────────────────────────────────────
router.post("/send", adminAuth, async (req, res) => {
  try {
    const { subject, heading, body, ctaText, ctaUrl, type, restaurantId } = req.body;
    if (!subject || !heading || !body)
      return res.json({ success: false, message: "Subject, heading, and body are required." });

    let restaurants = [];
    if (!restaurantId || restaurantId === "all") {
      restaurants = await restaurantModel.find({}).select("name email").lean();
    } else {
      const r = await restaurantModel.findById(restaurantId).select("name email").lean();
      if (!r) return res.json({ success: false, message: "Restaurant not found." });
      restaurants = [r];
    }

    if (restaurants.length === 0)
      return res.json({ success: false, message: "No restaurants found." });

    const cfg = TYPES[type] || TYPES.announcement;
    const resend = getResend();
    const from   = FROM_EMAIL();

    const ctaHtml = ctaText && ctaUrl
      ? `<a href="${ctaUrl}" style="display:inline-block;background:${cfg.color};color:white;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:800;font-size:15px;">${ctaText}</a>`
      : "";

    const buildHtml = (restaurantName) => `<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:${cfg.color};padding:28px 32px;">
      <p style="color:rgba(255,255,255,0.75);margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${cfg.label} · Crave Platform</p>
      <h1 style="color:white;margin:0;font-size:22px;font-weight:900;line-height:1.2;">${heading}</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:14px;font-weight:700;margin:0 0 16px;">Hi ${restaurantName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;white-space:pre-line;">${body}</p>
      ${ctaHtml}
    </div>
    <div style="padding:20px 32px;border-top:1px solid #f3f4f6;background:#fafafa;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">This message was sent by the Crave platform administrator to all restaurant partners.</p>
    </div>
  </div>
</body>
</html>`;

    let sent = 0, failed = 0;
    const BATCH = 10;

    for (let i = 0; i < restaurants.length; i += BATCH) {
      const batch = restaurants.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(r => resend.emails.send({
          from: `Crave Platform <${from}>`,
          to: r.email,
          subject,
          html: buildHtml(r.name),
        }))
      );
      results.forEach(r => r.status === "fulfilled" ? sent++ : failed++);
    }

    res.json({
      success: true,
      message: `Broadcast sent to ${sent} restaurant${sent !== 1 ? "s" : ""}.${failed > 0 ? ` ${failed} failed.` : ""}`,
      sent, failed, total: restaurants.length,
    });
  } catch (err) {
    console.error("[broadcast/send]", err);
    res.json({ success: false, message: "Failed to send broadcast." });
  }
});

// ── GET /api/broadcast/restaurants-count ──────────────────────────────────
router.get("/restaurants-count", adminAuth, async (req, res) => {
  try {
    const count = await restaurantModel.countDocuments({});
    res.json({ success: true, count });
  } catch {
    res.json({ success: false, count: 0 });
  }
});

export default router;