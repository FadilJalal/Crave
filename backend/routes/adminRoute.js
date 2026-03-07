import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import { superAdminLogin, loginRestaurant, getAdminStats } from "../controllers/adminController.js";

const adminRouter = express.Router();

adminRouter.post("/login-super", superAdminLogin);
adminRouter.post("/login-restaurant", loginRestaurant);

// Protected: only authenticated admins can see stats
adminRouter.get("/stats", adminAuth, getAdminStats);

export default adminRouter;
