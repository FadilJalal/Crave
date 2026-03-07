import express from "express";
import {
  forgotPassword,
  resetPassword,
  verifyResetToken,
} from "../controllers/passwordResetController.js";

const router = express.Router();

router.post("/forgot-password",   forgotPassword);
router.post("/reset-password",    resetPassword);
router.get("/verify-reset-token", verifyResetToken);

export default router;