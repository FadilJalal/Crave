import express from "express";
import multer from "multer";
import adminAuth from "../middleware/adminAuth.js";
import {
  addRestaurant,
  listRestaurants,
  removeRestaurant,
  toggleActive,
  editRestaurant,
  resetRestaurantPassword,
} from "../controllers/restaurantController.js";

// ── Multer Configuration ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => cb(null, `${Date.now()}${file.originalname}`),
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files allowed"), false);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const router = express.Router();

router.get("/list", listRestaurants);
router.post("/add",            upload.single("logo"), adminAuth, addRestaurant);
router.post("/remove",         adminAuth, removeRestaurant);
router.post("/toggle-active",  adminAuth, toggleActive);
router.post("/edit",           upload.single("logo"), adminAuth, editRestaurant);
router.post("/reset-password", adminAuth, resetRestaurantPassword);

export default router;