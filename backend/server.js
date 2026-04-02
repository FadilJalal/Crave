import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import authRouter from "./routes/authRoute.js";
import recommendationRouter from "./routes/recommendationRoute.js";
import { connectDB } from "./config/db.js";
import userRouter from "./routes/userRoute.js";
import foodRouter from "./routes/foodRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import restaurantRouter from "./routes/restaurantRoute.js";
import adminRouter from "./routes/adminRoute.js";
import restaurantAdminRoute from "./routes/restaurantAdminRoute.js";
import paymentRouter from "./routes/paymentRoute.js";
import chatRouter from "./routes/chatRoute.js";
import geocodeRouter from "./routes/geocodeRoute.js";
import promoRouter from "./routes/promoRoute.js";
import subRouter from "./routes/subscriptionRoute.js";
import emailCampaignRouter from "./routes/emailCampaignRoute.js";
import { startCampaignScheduler } from "./utils/campaignScheduler.js";
import broadcastRouter from "./routes/broadcastRoute.js";
import messageRouter from "./routes/messageRoute.js";
import reviewRouter from "./routes/reviewRoute.js";
import aiRouter from "./routes/aiRoute.js";
import aiRestaurantRouter from "./routes/aiRestaurantRoute.js";
import aiAdminRouter from "./routes/aiAdminRoute.js";
import inventoryRouter from "./routes/inventoryRoute.js";

// ── Validate critical environment variables ──────────────────────────────────
const requiredEnvVars = ["MONGO_URL", "JWT_SECRET"];
const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
if (missingEnvVars.length > 0) {
  console.error(`❌ [ERROR] Missing required environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

// ── Process-level crash guards ───────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception — server kept alive:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Promise Rejection — server kept alive:", reason);
});

const app = express();
const port = process.env.PORT || 4000;

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// ── Response Compression (gzip) ──────────────────────────────────────────────
// Reduces response size by 50-80% — massive performance gain!
app.use(compression({
  level: 6, // Balance between compression ratio and speed
  threshold: 1024, // Only compress responses larger than 1KB
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://localhost:5174,http://localhost:5175"
).split(",").map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// ── Body parsing ─────────────────────────────────────────────────────────────
// Stripe webhook needs raw body — must be registered BEFORE express.json()
app.use("/api/subscription/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ── File upload (multer) ──────────────────────────────────────────────────────
// Configured in individual route handlers to work with FormData
// NOTE: multer is NOT applied globally — it's attached to specific routes

// ── Request timeout — kills hanging requests after 30s ──────────────────────
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(503).json({ success: false, message: "Request timed out" });
    }
  });
  next();
});

// ── Cache Control Headers ────────────────────────────────────────────────────
// Enables browser caching for read-only endpoints (restaurant list, food items, etc.)
app.use((req, res, next) => {
  // Cache GET requests for 5 minutes
  if (req.method === "GET") {
    // Don't cache auth, user, or cart endpoints
    if (!req.path.includes("/user") && !req.path.includes("/cart") && !req.path.includes("/order")) {
      res.set("Cache-Control", "public, max-age=300, must-revalidate");
    }
  }
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/" || req.path.startsWith("/images"),
  message: { success: false, message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts, please try again later." },
});

app.use(generalLimiter);

// ── DB connection ─────────────────────────────────────────────────────────────
connectDB();

// ── Static files ─────────────────────────────────────────────────────────────
app.use("/images", express.static("uploads"));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api/user",            authLimiter, userRouter);
app.use("/api/food",            foodRouter);
app.use("/api/cart",            cartRouter);
app.use("/api/order",           orderRouter);
app.use("/api/restaurant",      restaurantRouter);
app.use("/api/admin",           authLimiter, adminRouter);
app.use("/api/restaurantadmin", restaurantAdminRoute);
app.use("/api/payment",         paymentRouter);
app.use("/api/auth",            authRouter);
app.use("/api/recommend",       recommendationRouter);
app.use("/api/chat",            chatRouter);
app.use("/api/geocode",         geocodeRouter);
app.use("/api/promo",           promoRouter);
app.use("/api/subscription",     subRouter);
app.use("/api/email-campaign",   emailCampaignRouter);
app.use("/api/broadcast",        broadcastRouter);
app.use("/api/messages",         messageRouter);
app.use("/api/review",           reviewRouter);
app.use("/api/ai",               aiRouter);
app.use("/api/ai/restaurant",    aiRestaurantRouter);
app.use("/api/ai/admin",         aiAdminRouter);
app.use("/api/inventory",        inventoryRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  if (!res.headersSent) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`✅ Server started on http://localhost:${port}`);
  startCampaignScheduler();
});