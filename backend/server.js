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

// Prevent crashes from unhandled errors
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException] Server kept alive:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection] Server kept alive:", reason);
});

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174,http://localhost:5175").split(",");
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many login attempts, please try again later." },
});

app.use(generalLimiter);

connectDB();

app.use("/images", express.static("uploads"));

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

app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({ success: false, message: "Internal server error" });
});

app.listen(port, () => console.log(`Server started on http://localhost:${port}`));