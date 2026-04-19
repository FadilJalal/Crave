import express from "express";
import { getWallet } from "../controllers/walletController.js";
import authMiddleware from "../middleware/auth.js";

const walletRouter = express.Router();

walletRouter.get("/", authMiddleware, getWallet);

export default walletRouter;
