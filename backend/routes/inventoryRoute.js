import express from "express";
import restaurantAuth from "../middleware/restaurantAuth.js";
import {
    getInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    bulkDeleteInventoryItems,
    bulkUpdateInventoryItems,
    updateStockLevel,
    getInventoryAlerts,
    getAIInsights,
    linkMenuItem,
    unlinkMenuItem,
    getRestaurantFoods,
    getDeductionLog,
    previewInventoryDeduction
} from "../controllers/inventoryController.js";

const router = express.Router();

// ── Get all inventory items ────────────────────────────────────────────────
router.get("/", restaurantAuth, getInventory);

// ── Add new inventory item ─────────────────────────────────────────────────
router.post("/add", restaurantAuth, addInventoryItem);

// ── Bulk delete inventory items ────────────────────────────────────────────
router.post("/bulk-delete", restaurantAuth, bulkDeleteInventoryItems);

// ── Bulk update inventory items ────────────────────────────────────────────
router.post("/bulk-update", restaurantAuth, bulkUpdateInventoryItems);

// ── Preview deduction for a candidate order (no data change) ───────────────
router.post("/deduction-preview", restaurantAuth, previewInventoryDeduction);

// ── Update inventory item ──────────────────────────────────────────────────
router.put("/:id", restaurantAuth, updateInventoryItem);

// ── Delete inventory item ──────────────────────────────────────────────────
router.delete("/:id", restaurantAuth, deleteInventoryItem);

// ── Update stock level (quick adjustment) ──────────────────────────────────
router.patch("/:id/stock", restaurantAuth, updateStockLevel);

// ── Get inventory alerts ───────────────────────────────────────────────────
router.get("/alerts", restaurantAuth, getInventoryAlerts);

// ── AI Inventory Insights ─────────────────────────────────────────────────
router.get("/ai-insights", restaurantAuth, getAIInsights);

// ── Get restaurant menu items (for linking UI) ────────────────────────────
router.get("/foods", restaurantAuth, getRestaurantFoods);

// ── Link a menu item to an inventory item ─────────────────────────────────
router.post("/:id/link", restaurantAuth, linkMenuItem);

// ── Unlink a menu item from an inventory item ─────────────────────────────
router.post("/:id/unlink", restaurantAuth, unlinkMenuItem);

// ── Get deduction log for an inventory item ───────────────────────────────
router.get("/:id/log", restaurantAuth, getDeductionLog);

export default router;