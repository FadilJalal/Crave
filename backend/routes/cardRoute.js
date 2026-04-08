import express from "express";
import { saveCard, getSavedCards, deleteCard } from "../controllers/cardController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/save", authMiddleware, saveCard);
router.get("/list", authMiddleware, getSavedCards);
router.post("/delete", authMiddleware, deleteCard);

export default router;