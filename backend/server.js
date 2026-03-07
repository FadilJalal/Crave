import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
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

const app = express();
const port = process.env.PORT || 4000;

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS — restrict to your frontend origins only
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174,http://localhost:5175").split(",");
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.) or from allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));

// Rate limiting — prevents brute force & spam
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // strict on login endpoints
  message: { success: false, message: "Too many login attempts, please try again later." },
});

app.use(generalLimiter);

// DB connection
connectDB();

// Static files
app.use("/images", express.static("uploads"));

// API endpoints
app.use("/api/user", authLimiter, userRouter);
app.use("/api/food", foodRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);
app.use("/api/restaurant", restaurantRouter);
app.use("/api/admin", authLimiter, adminRouter);
app.use("/api/restaurantadmin", restaurantAdminRoute);
app.use("/api/payment", paymentRouter);
app.use("/api/auth", authRouter);
app.use("/api/recommend", recommendationRouter);
app.use("/api/chat", chatRouter);
app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

// Global error handler — never leak stack traces to client
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({ success: false, message: "Internal server error" });
});

app.listen(port, () => console.log(`Server started on http://localhost:${port}`));
