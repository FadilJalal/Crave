import express from "express";
import {
  forgotPassword,
  resetPassword,
  verifyResetToken,
} from "../controllers/passwordResetController.js";
import { validate, schemas } from "../middleware/validate.js";

const router = express.Router();

router.post("/forgot-password",   forgotPassword);
router.post("/reset-password",    validate(schemas.resetPassword), resetPassword);
router.get("/verify-reset-token", verifyResetToken);

export default router;