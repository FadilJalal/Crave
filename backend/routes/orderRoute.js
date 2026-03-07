import express from "express";
import authMiddleware from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";
import restaurantAuth from "../middleware/restaurantAuth.js";

import {
  listOrders,
  placeOrder,
  updateStatus,
  userOrders,
  verifyOrder,
  placeOrderCod,
  listRestaurantOrders,
  restaurantUpdateStatus,
} from "../controllers/orderController.js";

const orderRouter = express.Router();

// Customer routes
orderRouter.post("/userorders", authMiddleware, userOrders);
orderRouter.post("/place", authMiddleware, placeOrder);
orderRouter.post("/placecod", authMiddleware, placeOrderCod);
orderRouter.post("/verify", verifyOrder);

// Super Admin routes
orderRouter.get("/list", adminAuth, listOrders);
orderRouter.post("/status", adminAuth, updateStatus);

// Restaurant Admin routes — use restaurantAuth so req.restaurantId is set
orderRouter.get("/restaurant/list", restaurantAuth, listRestaurantOrders);
orderRouter.post("/restaurant/status", restaurantAuth, restaurantUpdateStatus);

export default orderRouter;
