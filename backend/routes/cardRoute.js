import express from "express";
import { saveCard, getSavedCards, deleteCard } from "../controllers/cardController.js";

const router = express.Router();

router.post("/save", saveCard);
router.get("/list", getSavedCards);
router.post("/delete", deleteCard);

export default router;
