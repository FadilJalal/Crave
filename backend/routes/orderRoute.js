import express from "express";
import authMiddleware from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";
import restaurantAuth from "../middleware/restaurantAuth.js";
import { validate, schemas } from "../middleware/validate.js";

import {
  listOrders,
  placeOrder,
  updateStatus,
  userOrders,
  verifyOrder,
  placeOrderCod,
  listRestaurantOrders,
  restaurantUpdateStatus,
  cancelOrder,
  quoteSharedDelivery,
} from "../controllers/orderController.js";

import orderModel from "../models/orderModel.js";

const orderRouter = express.Router();

// Customer routes
orderRouter.post("/userorders", authMiddleware, userOrders);
orderRouter.post("/place", authMiddleware, validate(schemas.placeOrder), placeOrder);
orderRouter.post("/placecod", authMiddleware, placeOrderCod);
orderRouter.post("/verify", verifyOrder);
orderRouter.post("/cancel", authMiddleware, cancelOrder);
orderRouter.post("/shared-delivery/quote", authMiddleware, quoteSharedDelivery);

// Order tracking by ID (customer must own the order)
orderRouter.get("/track/:orderId", authMiddleware, async (req, res) => {
  try {
    const order = await orderModel
      .findById(req.params.orderId)
      .populate("restaurantId", "name logo location")
      .populate("sharedMatchedOrderId", "address status")
      .lean();

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    if (String(order.userId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error("[track order]", error.message);
    res.json({ success: false, message: "Error fetching order" });
  }
});

// Super Admin routes
orderRouter.get("/list", adminAuth, listOrders);
orderRouter.post("/status", adminAuth, updateStatus);

// Restaurant Admin routes
orderRouter.get("/restaurant/list", restaurantAuth, listRestaurantOrders);
orderRouter.post("/restaurant/status", restaurantAuth, restaurantUpdateStatus);

export default orderRouter;