import express from "express";
import restaurantAuth from "../middleware/restaurantAuth.js";
import {
    getInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    bulkDeleteInventoryItems,
    bulkUpdateInventoryItems,
    bulkImportInventory,
    updateStockLevel,
    getInventoryAlerts,
    getAIInsights,
    linkMenuItem,
    unlinkMenuItem,
    syncFoodIngredients,
    getFoodIngredients,
    getRestaurantFoods,
    getDeductionLog,
    getAllDeductionLogs,
    previewInventoryDeduction,
    getInventoryAnalytics,
    getStockTurnoverAnalytics,
    getSupplierAnalytics,
    getInventoryPaginated,
    getCostAnalysis
} from "../controllers/inventoryController.js";

const router = express.Router();

// ── SPECIFIC ROUTES FIRST (must come before :id routes) ──────────────────
// ── Get all inventory items ─────────────────────────────────────────────────
router.get("/", restaurantAuth, getInventory);

// ── Get paginated inventory with filtering ──────────────────────────────────
router.get("/paginated/list", restaurantAuth, getInventoryPaginated);

// ── Get inventory alerts ────────────────────────────────────────────────────
router.get("/alerts", restaurantAuth, getInventoryAlerts);

// ── AI Inventory Insights ───────────────────────────────────────────────────
router.get("/ai-insights", restaurantAuth, getAIInsights);

// ── Analytics endpoints ─────────────────────────────────────────────────────
router.get("/analytics/inventory", restaurantAuth, getInventoryAnalytics);
router.get("/analytics/turnover", restaurantAuth, getStockTurnoverAnalytics);
router.get("/analytics/suppliers", restaurantAuth, getSupplierAnalytics);
router.get("/analytics/costs", restaurantAuth, getCostAnalysis);

// ── Get restaurant menu items (for linking UI) ──────────────────────────────
router.get("/foods", restaurantAuth, getRestaurantFoods);

// ── Link/Sync a food item's ingredients (called from menu add/edit) ──────
router.post("/link-sync", restaurantAuth, syncFoodIngredients);
router.get("/food-ingredients/:foodId", restaurantAuth, getFoodIngredients);

// ── Add new inventory item ──────────────────────────────────────────────────
router.post("/add", restaurantAuth, addInventoryItem);

// ── Bulk delete inventory items ─────────────────────────────────────────────
router.post("/bulk-delete", restaurantAuth, bulkDeleteInventoryItems);

// ── Bulk update inventory items ─────────────────────────────────────────────
router.post("/bulk-update", restaurantAuth, bulkUpdateInventoryItems);

// ── Bulk import inventory items ─────────────────────────────────────────────
router.post("/bulk-import", restaurantAuth, bulkImportInventory);

// ── Preview deduction for a candidate order (no data change) ────────────────
router.post("/deduction-preview", restaurantAuth, previewInventoryDeduction);

// ── Get all deduction logs for the restaurant ──────────────────────────────
router.get("/logs/all", restaurantAuth, getAllDeductionLogs);

// ── PARAMETERIZED ROUTES (:id routes must come last) ─────────────────────
// ── Get deduction log for an inventory item ─────────────────────────────────
router.get("/:id/log", restaurantAuth, getDeductionLog);

// ── Update stock level (quick adjustment) ───────────────────────────────────
router.patch("/:id/stock", restaurantAuth, updateStockLevel);

// ── Link a menu item to an inventory item ────────────────────────────────────
router.post("/:id/link", restaurantAuth, linkMenuItem);

// ── Unlink a menu item from an inventory item ────────────────────────────────
router.post("/:id/unlink", restaurantAuth, unlinkMenuItem);

// ── Update inventory item ───────────────────────────────────────────────────
router.put("/:id", restaurantAuth, updateInventoryItem);

// ── Delete inventory item ───────────────────────────────────────────────────
router.delete("/:id", restaurantAuth, deleteInventoryItem);

export default router;