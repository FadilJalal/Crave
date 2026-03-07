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

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => cb(null, `${Date.now()}${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/list", listRestaurants);
router.post("/add",            adminAuth, upload.single("logo"), addRestaurant);
router.post("/remove",         adminAuth, removeRestaurant);
router.post("/toggle-active",  adminAuth, toggleActive);
router.post("/edit",           adminAuth, upload.single("logo"), editRestaurant);
router.post("/reset-password", adminAuth, resetRestaurantPassword);

export default router;