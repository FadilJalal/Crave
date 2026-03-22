import express from "express";
import { Resend } from "resend";
import restaurantAuth from "../middleware/restaurantAuth.js";
import restaurantModel from "../models/restaurantModel.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import campaignModel from "../models/campaignModel.js";

const router     = express.Router();
const FROM_EMAIL = () => process.env.FROM_EMAIL || "onboarding@resend.dev";
const getResend  = () => new Resend(process.env.RESEND_API_KEY);

// ── Pro plan gate ──────────────────────────────────────────────────────────
async function proOnly(req, res, next) {
  const restaurant = await restaurantModel.findById(req.restaurantId).select("subscription name");
  if (!restaurant) return res.json({ success: false, message: "Restaurant not found." });
  if (restaurant.subscription?.plan !== "pro" || restaurant.subscription?.status !== "active")
    return res.json({ success: false, message: "Email campaigns are a Pro feature. Please upgrade your plan." });
  req.restaurant = restaurant;
  next();
}

// ── Build HTML email ───────────────────────────────────────────────────────
function buildHtml({ restaurantName, heading, body, ctaText, ctaUrl, accentColor, customerName }) {
  const greeting = customerName ? `Hi ${customerName},\n\n` : "";
  const bodyWithGreeting = greeting + body;
  const ctaHtml = ctaText && ctaUrl
    ? `<a href="${ctaUrl}" style="display:inline-block;background:${accentColor};color:white;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:800;font-size:15px;">${ctaText}</a>`
    : "";
  return `<!DOCTYPE html>
<html>
<body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:${accentColor};padding:28px 32px;">
      <p style="color:rgba(255,255,255,0.8);margin:0 0 4px;font-size:13px;">${restaurantName}</p>
      <h1 style="color:white;margin:0;font-size:24px;font-weight:900;line-height:1.2;">${heading}</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;white-space:pre-line;">${bodyWithGreeting}</p>
      ${ctaHtml}
    </div>
    <div style="padding:20px 32px;border-top:1px solid #f3f4f6;background:#fafafa;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">You're receiving this because you ordered from ${restaurantName} on Crave. · <a href="#" style="color:#9ca3af;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ── Send to all customers ──────────────────────────────────────────────────
async function sendToCustomers({ restaurant, subject, heading, body, ctaText, ctaUrl, type, personalize }) {
  const orders = await orderModel.find({ restaurantId: restaurant._id }).select("userId").lean();
  const uniqueUserIds = [...new Set(orders.map(o => String(o.userId)))];
  if (uniqueUserIds.length === 0) return { sent: 0, failed: 0, recipientCount: 0 };

  const users = await userModel.find({ _id: { $in: uniqueUserIds } }).select("name email").lean();
  const accentColor = type === "offer" ? "#ff4e2a" : type === "menu" ? "#8b5cf6" : "#111827";
  const resend = getResend();
  const from = FROM_EMAIL();

  let sent = 0, failed = 0;
  const BATCH = 10;

  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(user => resend.emails.send({
        from: `${restaurant.name} via Crave. <${from}>`,
        to: user.email,
        subject,
        html: buildHtml({
          restaurantName: restaurant.name,
          heading, body, ctaText, ctaUrl, accentColor,
          customerName: personalize ? user.name?.split(" ")[0] : null,
        }),
      }))
    );
    results.forEach(r => r.status === "fulfilled" ? sent++ : failed++);
  }

  return { sent, failed, recipientCount: users.length };
}

// ── GET /customers ─────────────────────────────────────────────────────────
router.get("/customers", restaurantAuth, proOnly, async (req, res) => {
  try {
    const orders = await orderModel.find({ restaurantId: req.restaurantId }).select("userId").lean();
    const uniqueUserIds = [...new Set(orders.map(o => String(o.userId)))];
    const users = await userModel.find({ _id: { $in: uniqueUserIds } }).select("name email").lean();
    res.json({ success: true, count: users.length, customers: users });
  } catch (err) {
    console.error("[email/customers]", err);
    res.json({ success: false, message: "Failed to fetch customers." });
  }
});

// ── POST /send ─────────────────────────────────────────────────────────────
router.post("/send", restaurantAuth, proOnly, async (req, res) => {
  try {
    const { subject, heading, body, ctaText, ctaUrl, type, personalize, scheduledAt } = req.body;
    if (!subject || !heading || !body)
      return res.json({ success: false, message: "Subject, heading, and body are required." });

    // Scheduled send — save and return
    if (scheduledAt) {
      const schedDate = new Date(scheduledAt);
      if (schedDate <= new Date())
        return res.json({ success: false, message: "Scheduled time must be in the future." });

      await campaignModel.create({
        restaurantId: req.restaurantId,
        type: type || "general",
        subject, heading, body,
        ctaText: ctaText || "",
        ctaUrl: ctaUrl || "",
        status: "scheduled",
        scheduledAt: schedDate,
      });

      return res.json({ success: true, message: `Campaign scheduled for ${schedDate.toLocaleString("en-AE")}.`, scheduled: true });
    }

    // Immediate send
    const orders = await orderModel.find({ restaurantId: req.restaurantId }).select("userId").lean();
    if (orders.length === 0)
      return res.json({ success: false, message: "No customers to send to yet." });

    const { sent, failed, recipientCount } = await sendToCustomers({
      restaurant: req.restaurant, subject, heading, body, ctaText, ctaUrl, type, personalize,
    });

    await campaignModel.create({
      restaurantId: req.restaurantId,
      type: type || "general",
      subject, heading, body,
      ctaText: ctaText || "",
      ctaUrl: ctaUrl || "",
      status: sent > 0 ? "sent" : "failed",
      sentAt: new Date(),
      recipientCount,
      sentCount: sent,
      failedCount: failed,
    });

    res.json({
      success: true,
      message: `Campaign sent to ${sent} customer${sent !== 1 ? "s" : ""}.${failed > 0 ? ` ${failed} failed.` : ""}`,
      sent, failed,
    });
  } catch (err) {
    console.error("[email/send]", err);
    res.json({ success: false, message: "Failed to send campaign." });
  }
});

// ── GET /history ───────────────────────────────────────────────────────────
router.get("/history", restaurantAuth, proOnly, async (req, res) => {
  try {
    const campaigns = await campaignModel
      .find({ restaurantId: req.restaurantId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ success: true, campaigns });
  } catch (err) {
    res.json({ success: false, message: "Failed to load history." });
  }
});

// ── DELETE /history/:id ────────────────────────────────────────────────────
router.delete("/history/:id", restaurantAuth, proOnly, async (req, res) => {
  try {
    await campaignModel.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    res.json({ success: true });
  } catch {
    res.json({ success: false, message: "Failed to delete." });
  }
});

export { sendToCustomers };
export default router;