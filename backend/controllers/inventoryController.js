import inventoryModel from "../models/inventoryModel.js";
import mongoose from "mongoose";

/**
 * Smart quantity parser: extracts numbers from strings like "20pcs", "15 PC", "10 units"
 * Defaults to 1 if no clear pattern is found.
 */
const extractQuantityFromName = (name = "") => {
    const text = name.toLowerCase().trim();
    if (!text) return 1;

    // Pattern 1: Look for numbers associated with units (20pcs, 15-piece, 10 units)
    const match = text.match(/(\d+(?:\.\d+)?)\s*[-]*\s*(?:pcs|pieces?|pc|units?|items?|counts?|sticks?|nuggets?|wings?|buckets?|portions?|strips?|slices?|pcs\.)\b/);
    if (match && match[1]) {
        const val = parseFloat(match[1]);
        return val > 0 ? val : 1;
    }

    // Pattern 2: "Bucket of 15", "Order of 6"
    const ofMatch = text.match(/\b(?:bucket|order|pack|box|deck|set|tray|plate|bowl|serving)\s+(?:of\s+)?(\d+)/i);
    if (ofMatch && ofMatch[1]) {
        return parseFloat(ofMatch[1]) || 1;
    }

    // Pattern 3: Look for numbers in parentheses like "(20)" or "[15]" near the end
    const parenMatch = text.match(/[\(\[](\d+)[\)\]]\s*$/);
    if (parenMatch && parenMatch[1]) {
        return parseFloat(parenMatch[1]) || 1;
    }

    // Pattern 4: Fallback - check for leading numbers followed by a space (6 Nugget, 2 Pizza)
    const leadingMatch = text.match(/^(\d+)\s/);
    if (leadingMatch && leadingMatch[1]) {
        return parseFloat(leadingMatch[1]) || 1;
    }

    return 1;
};

const normalizeLinkedMenuItems = (linkedMenuItems = []) => {
    const deduped = new Map();

    linkedMenuItems.forEach((link, index) => {
        const populatedFood = link?.foodId && typeof link.foodId === "object" && link.foodId.name
            ? link.foodId
            : null;
        const rawFoodId = link?._rawFoodId || (populatedFood?._id ? String(populatedFood._id) : (link?.foodId ? String(link.foodId) : ""));
        const key = rawFoodId || `missing-${index}`;

        deduped.set(key, {
            ...link,
            foodId: populatedFood || rawFoodId || null,
            quantityPerOrder: Number(link?.quantityPerOrder) || 0,
            resolvedFoodId: rawFoodId || null,
            resolvedFoodName: populatedFood?.name || null,
            isMissingFood: !populatedFood,
        });
    });

    return Array.from(deduped.values());
};

const serializeInventoryItem = (item, rawFoodIds = []) => {
    const plainItem = item.toObject ? item.toObject() : item;
    const linkedMenuItems = normalizeLinkedMenuItems(
        (plainItem.linkedMenuItems || []).map((link, index) => ({
            ...link,
            _rawFoodId: rawFoodIds[index] || null,
        }))
    );

    return {
        ...plainItem,
        linkedMenuItems,
    };
};

// ── Get all inventory items for restaurant ────────────────────────────────
const getInventory = async (req, res) => {
    try {
        const items = await inventoryModel
            .find({ restaurantId: req.restaurantId, isActive: true })
            .sort({ createdAt: -1 });

        const rawFoodIdsByItem = new Map(
            items.map(item => [
                String(item._id),
                (item.linkedMenuItems || []).map(link => String(link.foodId || ""))
            ])
        );

        await inventoryModel.populate(items, {
            path: "linkedMenuItems.foodId",
            select: "name image price category"
        });

        // Calculate stock status for each item
        const itemsWithStatus = items.map(item => {
            const serializedItem = serializeInventoryItem(item, rawFoodIdsByItem.get(String(item._id)) || []);
            let status = "normal";
            let statusMessage = "Stock level normal";

            if (serializedItem.currentStock <= serializedItem.minimumStock) {
                status = "low";
                statusMessage = `Low stock - ${serializedItem.currentStock} ${serializedItem.unit} remaining`;
            } else if (serializedItem.currentStock >= serializedItem.maximumStock) {
                status = "high";
                statusMessage = `Overstock - ${serializedItem.currentStock} ${serializedItem.unit} in stock`;
            }

            // Check expiry
            let expiryStatus = "safe";
            if (serializedItem.expiryDate) {
                const daysUntilExpiry = Math.ceil((new Date(serializedItem.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                if (daysUntilExpiry <= 0) {
                    expiryStatus = "expired";
                } else if (daysUntilExpiry <= 7) {
                    expiryStatus = "expiring_soon";
                }
            }

            return {
                ...serializedItem,
                status,
                statusMessage,
                expiryStatus,
                daysUntilExpiry: serializedItem.expiryDate ? Math.ceil((new Date(serializedItem.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null
            };
        });

        // Summary stats
        const summary = {
            totalItems: items.length,
            lowStock: itemsWithStatus.filter(i => i.status === "low").length,
            expired: itemsWithStatus.filter(i => i.expiryStatus === "expired").length,
            expiringSoon: itemsWithStatus.filter(i => i.expiryStatus === "expiring_soon").length,
            totalValue: itemsWithStatus.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0)
        };

        res.json({
            success: true,
            data: itemsWithStatus,
            summary
        });
    } catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).json({ success: false, message: "Failed to fetch inventory" });
    }
};

// ── Add new inventory item ─────────────────────────────────────────────────
const addInventoryItem = async (req, res) => {
    try {
        const {
            itemName,
            category,
            unit,
            currentStock,
            minimumStock,
            maximumStock,
            unitCost,
            supplier,
            expiryDate,
            notes
        } = req.body;

        // Validation
        if (!itemName || !category || !unit || currentStock === undefined) {
            return res.status(400).json({
                success: false,
                message: "Item name, category, unit, and current stock are required"
            });
        }

        let linkedMenuItems = [];
        // ── Auto-linking logic moved to dedicated sync function for precision ──


        // Check for duplicate before creating (escaping special chars for strict match)
        const escapedName = itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existing = await inventoryModel.findOne({
            restaurantId: req.restaurantId,
            itemName: new RegExp(`^${escapedName}$`, 'i'),
            isActive: true
        });

        if (existing) {
             // If it exists, we just update it instead of making a duplicate
             existing.currentStock += Number(currentStock);
             if (category) existing.category = category;
             if (unit) existing.unit = unit;
             if (unitCost) existing.unitCost = Number(unitCost);
             await existing.save();
             return res.json({ success: true, message: "Inventory updated (item already existed)", data: existing });
        }

        const newItem = new inventoryModel({
            restaurantId: req.restaurantId,
            itemName,
            category,
            unit,
            currentStock: Number(currentStock),
            minimumStock: Number(minimumStock) || 10,
            maximumStock: Number(maximumStock) || 100,
            unitCost: Number(unitCost) || 0,
            supplier: supplier ? (typeof supplier === 'string' ? JSON.parse(supplier) : supplier) : {},
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            notes,
            isActive: true,
            linkedMenuItems,
            lastRestocked: new Date()
        });

        await newItem.save();

        if (linkedMenuItems.length > 0) {
            const populated = await inventoryModel.findById(newItem._id).populate("linkedMenuItems.foodId", "name image price category");
            const rawFoodIds = (populated.linkedMenuItems || []).map(link => String(link.foodId?._id || link.foodId || ""));
            return res.json({
                success: true,
                message: "Inventory item added and auto-linked successfully",
                data: serializeInventoryItem(populated, rawFoodIds)
            });
        }

        res.json({
            success: true,
            message: "Inventory item added successfully",
            data: newItem
        });
    } catch (error) {
        console.error("Error adding inventory item:", error.message || error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to add inventory item: " + (error.message || "Unknown error")
        });
    }
};

// ── Update inventory item ──────────────────────────────────────────────────
const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validate the item belongs to this restaurant
        const item = await inventoryModel.findOne({
            _id: id,
            restaurantId: req.restaurantId
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Inventory item not found"
            });
        }

        // Convert numeric fields
        if (updates.currentStock !== undefined) updates.currentStock = Number(updates.currentStock);
        if (updates.minimumStock !== undefined) updates.minimumStock = Number(updates.minimumStock);
        if (updates.maximumStock !== undefined) updates.maximumStock = Number(updates.maximumStock);
        if (updates.unitCost !== undefined) updates.unitCost = Number(updates.unitCost);

        // Parse supplier if it's a string
        if (updates.supplier && typeof updates.supplier === 'string') {
            updates.supplier = JSON.parse(updates.supplier);
        }

        // Convert expiry date
        if (updates.expiryDate) {
            updates.expiryDate = new Date(updates.expiryDate);
        }

        // Update lastRestocked if stock was changed
        if (updates.currentStock !== undefined && updates.currentStock > item.currentStock) {
            updates.lastRestocked = new Date();
        }

        // Auto-link logic removed as per requirement for explicit linking only.

        const updatedItem = await inventoryModel.findByIdAndUpdate(
            id,
            updates,
            { new: true }
        );

        res.json({
            success: true,
            message: "Inventory item updated successfully",
            data: updatedItem
        });
    } catch (error) {
        console.error("Error updating inventory item:", error);
        res.status(500).json({ success: false, message: "Failed to update inventory item" });
    }
};

// ── Delete inventory item ──────────────────────────────────────────────────
const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete by setting isActive to false (with restaurantId verification)
        const result = await inventoryModel.findOneAndUpdate(
            { _id: id, restaurantId: req.restaurantId },
            { isActive: false },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Inventory item not found or you don't have permission to delete it"
            });
        }

        res.json({
            success: true,
            message: "Inventory item removed successfully",
            data: result
        });
    } catch (error) {
        console.error("Error deleting inventory item:", error);
        res.status(500).json({ success: false, message: "Failed to delete inventory item" });
    }
};

// ── Bulk delete inventory items ───────────────────────────────────────────
const bulkDeleteInventoryItems = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: "Please provide an array of item IDs" });
        }

        // Verify all items belong to this restaurant before deleting
        const itemsToDelete = await inventoryModel.find({
            _id: { $in: ids },
            restaurantId: req.restaurantId
        });

        if (itemsToDelete.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No items found to delete or you don't have permission"
            });
        }

        // Perform bulk soft delete
        const result = await inventoryModel.updateMany(
            { _id: { $in: ids }, restaurantId: req.restaurantId },
            { isActive: false },
            { multi: true }
        );

        // Verify the update actually happened
        if (result.modifiedCount === 0) {
            return res.status(500).json({
                success: false,
                message: "Failed to delete items - no records were updated"
            });
        }

        res.json({
            success: true,
            message: `${result.modifiedCount} item${result.modifiedCount !== 1 ? "s" : ""} removed successfully`,
            count: result.modifiedCount,
            deletedCount: itemsToDelete.length
        });
    } catch (error) {
        console.error("Error bulk deleting inventory items:", error);
        res.status(500).json({ success: false, message: "Failed to delete items" });
    }
};

// ── Bulk update inventory items ───────────────────────────────────────────
const bulkUpdateInventoryItems = async (req, res) => {
    try {
        const { updates } = req.body;
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ success: false, message: "Please provide an array of updates" });
        }

        let totalUpdated = 0;
        const results = [];

        for (const update of updates) {
            const { id, ...fields } = update;
            if (!id) continue;

            // Validate fields
            const allowedFields = ['itemName', 'category', 'unit', 'currentStock', 'minimumStock', 'maximumStock', 'unitCost', 'supplier', 'expiryDate', 'notes'];
            const updateData = {};

            for (const [key, value] of Object.entries(fields)) {
                if (allowedFields.includes(key)) {
                    if (key === 'supplier' && typeof value === 'string') {
                        updateData.supplier = JSON.parse(value);
                    } else if (['currentStock', 'minimumStock', 'maximumStock', 'unitCost'].includes(key)) {
                        updateData[key] = Number(value);
                    } else if (key === 'expiryDate' && value) {
                        updateData.expiryDate = new Date(value);
                    } else {
                        updateData[key] = value;
                    }
                }
            }

            if (Object.keys(updateData).length > 0) {
                const result = await inventoryModel.updateOne(
                    { _id: id, restaurantId: req.restaurantId },
                    { $set: updateData }
                );
                if (result.modifiedCount > 0) {
                    totalUpdated++;
                    results.push({ id, success: true });
                } else {
                    results.push({ id, success: false, message: "No changes or item not found" });
                }
            }
        }

        res.json({
            success: true,
            message: `${totalUpdated} item${totalUpdated !== 1 ? "s" : ""} updated successfully`,
            count: totalUpdated,
            results
        });
    } catch (error) {
        console.error("Error bulk updating inventory items:", error);
        res.status(500).json({ success: false, message: "Failed to update items" });
    }
};

// ── Bulk import inventory items ───────────────────────────────────────────
const bulkImportInventory = async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Please provide an array of items" });
        }

        const foodModel = (await import("../models/foodModel.js")).default;
        const menuFoods = await foodModel.find({ restaurantId: req.restaurantId }).select("name ingredients description").lean();

        let createdCount = 0;
        let updatedCount = 0;
        let linkedCount = 0;

        for (const itemData of items) {
            let { itemName, category, unit, currentStock, minimumStock, maximumStock, unitCost, supplier, notes } = itemData;
            
            if (!itemName) continue;

            // Robust supplier handling
            if (supplier && typeof supplier === 'string') {
                try { supplier = JSON.parse(supplier); } catch (e) {}
            }

            // Escape special chars to prevent regex errors and ensure strict unique matching
            const escapedName = itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const existingItem = await inventoryModel.findOne({
                restaurantId: req.restaurantId,
                itemName: new RegExp(`^${escapedName}$`, 'i'),
                isActive: true
            });

            if (existingItem) {
                 // Update existing item
                 const updates = {
                     category: category || existingItem.category,
                     unit: unit || existingItem.unit,
                     currentStock: currentStock !== undefined ? Number(currentStock) : existingItem.currentStock,
                     minimumStock: minimumStock !== undefined ? Number(minimumStock) : existingItem.minimumStock,
                     maximumStock: maximumStock !== undefined ? Number(maximumStock) : existingItem.maximumStock,
                     unitCost: unitCost !== undefined ? Number(unitCost) : existingItem.unitCost,
                     supplier: supplier || existingItem.supplier,
                     notes: notes || existingItem.notes,
                     lastRestocked: (currentStock !== undefined && Number(currentStock) > existingItem.currentStock) ? new Date() : existingItem.lastRestocked
                 };
                 
                 // Smart linking logic: if no links provided or empty, try to find a match
                 if (itemData.linkedMenuItems && Array.isArray(itemData.linkedMenuItems) && itemData.linkedMenuItems.length > 0) {
                     updates.linkedMenuItems = itemData.linkedMenuItems;
                 } else if (!existingItem.linkedMenuItems || existingItem.linkedMenuItems.length === 0) {
                     const itemNameLower = itemName.toLowerCase().trim();
                     const normalizedSearch = itemNameLower
                         .replace(/potatoe|potos|potat/gi, "potato")
                         .replace(/s\b|es\b/gi, "")
                         .trim();

                      const match = menuFoods.find(f => {
                         const fName = (f.name || "").toLowerCase();
                         const fIngsRaw = (f.ingredients || "").toLowerCase();
                         const DISH_KEYWORDS = ["combo", "meal", "bucket", "deal", "offer", "pack", "sandwich", "burger", "pizza", "platter", "feast", "box"];
                         const isLikelyDish = DISH_KEYWORDS.some(k => itemNameLower.includes(k));
                        // Priority 1: High Confidence - Ingredient String Match (ALWAYS ALLOW)
                        if (fIngsRaw.includes(normalizedSearch)) return true;
                         if (fName === itemNameLower) return true;
                         if (isLikelyDish) return false;
                         return new RegExp(`\\b${normalizedSearch}\\b`, "i").test(fName);
                      });
                     if (match) {
                         const qty = extractQuantityFromName(match.name);
                         updates.linkedMenuItems = [{ foodId: match._id, quantityPerOrder: qty }];
                         linkedCount++;
                     }
                 }
                 
                 await inventoryModel.findByIdAndUpdate(existingItem._id, updates);
                 updatedCount++;
            } else {
                // Create new item
                let linkedMenuItems = [];
                if (itemData.linkedMenuItems && Array.isArray(itemData.linkedMenuItems) && itemData.linkedMenuItems.length > 0) {
                    linkedMenuItems = itemData.linkedMenuItems;
                    linkedCount++;
                } else {
                    const itemNameLower = itemName.toLowerCase().trim();
                    const normalizedSearch = itemNameLower
                        .replace(/potatoe|potos|potat/gi, "potato")
                        .replace(/s\b|es\b/gi, "")
                        .trim();

                    const match = menuFoods.find(f => {
                        const fName = (f.name || "").toLowerCase();
                        const fIngsRaw = (f.ingredients || "").toLowerCase();
                        const DISH_KEYWORDS = ["combo", "meal", "bucket", "deal", "offer", "pack", "sandwich", "burger", "pizza", "platter", "feast", "box"];
                        const isLikelyDish = DISH_KEYWORDS.some(k => itemNameLower.includes(k));

                        // Priority 1: High Confidence - Ingredient String Match (ALWAYS ALLOW)
                        if (fIngsRaw.includes(normalizedSearch)) return true;

                        // Priority 2: Medium Confidence - Exact Name Match
                        if (fName === itemNameLower) return true;

                        // Priority 3: Partial Match - ONLY IF IT'S NOT A DISH NAME
                        if (isLikelyDish) return false;

                        // Final check: Word boundaries match
                        return new RegExp(`\\b${normalizedSearch}\\b`, 'i').test(fName);
                    });
                    if (match) {
                        const qty = extractQuantityFromName(match.name);
                        linkedMenuItems = [{ foodId: match._id, quantityPerOrder: qty }];
                        linkedCount++;
                    }
                }

                const newItem = new inventoryModel({
                    restaurantId: req.restaurantId,
                    itemName,
                    category: category || "other",
                    unit: unit || "pieces",
                    currentStock: Number(currentStock) || 0,
                    minimumStock: Number(minimumStock) || 10,
                    maximumStock: Number(maximumStock) || 100,
                    unitCost: Number(unitCost) || 0,
                    supplier: supplier || {},
                    notes: notes || "",
                    linkedMenuItems,
                    isActive: true,
                    lastRestocked: new Date()
                });
                await newItem.save();
                createdCount++;
            }
        }

        res.json({
            success: true,
            message: `Import complete: ${createdCount} created, ${updatedCount} updated, ${linkedCount} auto-linked.`,
            stats: { created: createdCount, updated: updatedCount, linked: linkedCount }
        });
    } catch (error) {
        console.error("Error bulk importing inventory:", error);
        res.status(500).json({ success: false, message: "Failed to import items" });
    }
};

// ── Update stock level (quick adjustment) ──────────────────────────────────
const updateStockLevel = async (req, res) => {
    try {
        const { id } = req.params;
        const { newStock, adjustment } = req.body;

        const item = await inventoryModel.findOne({
            _id: id,
            restaurantId: req.restaurantId
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Inventory item not found"
            });
        }

        let updatedStock;
        if (newStock !== undefined) {
            updatedStock = Number(newStock);
        } else if (adjustment !== undefined) {
            updatedStock = item.currentStock + Number(adjustment);
        } else {
            return res.status(400).json({
                success: false,
                message: "Either newStock or adjustment must be provided"
            });
        }

        if (updatedStock < 0) {
            return res.status(400).json({
                success: false,
                message: "Stock cannot be negative"
            });
        }

        const updatedItem = await inventoryModel.findByIdAndUpdate(
            id,
            {
                currentStock: updatedStock,
                lastRestocked: updatedStock > item.currentStock ? new Date() : item.lastRestocked
            },
            { new: true }
        );

        res.json({
            success: true,
            message: "Stock level updated successfully",
            data: updatedItem
        });
    } catch (error) {
        console.error("Error updating stock level:", error);
        res.status(500).json({ success: false, message: "Failed to update stock level" });
    }
};

// ── Get inventory alerts ───────────────────────────────────────────────────
const getInventoryAlerts = async (req, res) => {
    try {
        const items = await inventoryModel.find({
            restaurantId: req.restaurantId,
            isActive: true
        });

        const alerts = {
            lowStock: [],
            expired: [],
            expiringSoon: [],
            overstock: []
        };

        items.forEach(item => {
            // Low stock alerts
            if (item.currentStock <= item.minimumStock) {
                alerts.lowStock.push({
                    id: item._id,
                    itemName: item.itemName,
                    currentStock: item.currentStock,
                    minimumStock: item.minimumStock,
                    unit: item.unit
                });
            }

            // Overstock alerts
            if (item.currentStock >= item.maximumStock) {
                alerts.overstock.push({
                    id: item._id,
                    itemName: item.itemName,
                    currentStock: item.currentStock,
                    maximumStock: item.maximumStock,
                    unit: item.unit
                });
            }

            // Expiry alerts
            if (item.expiryDate) {
                const daysUntilExpiry = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));

                if (daysUntilExpiry <= 0) {
                    alerts.expired.push({
                        id: item._id,
                        itemName: item.itemName,
                        expiryDate: item.expiryDate,
                        daysOverdue: Math.abs(daysUntilExpiry)
                    });
                } else if (daysUntilExpiry <= 7) {
                    alerts.expiringSoon.push({
                        id: item._id,
                        itemName: item.itemName,
                        expiryDate: item.expiryDate,
                        daysUntilExpiry
                    });
                }
            }
        });

        res.json({
            success: true,
            data: alerts,
            summary: {
                totalAlerts: alerts.lowStock.length + alerts.expired.length + alerts.expiringSoon.length + alerts.overstock.length,
                lowStockCount: alerts.lowStock.length,
                expiredCount: alerts.expired.length,
                expiringSoonCount: alerts.expiringSoon.length,
                overstockCount: alerts.overstock.length
            }
        });
    } catch (error) {
        console.error("Error fetching inventory alerts:", error);
        res.status(500).json({ success: false, message: "Failed to fetch inventory alerts" });
    }
};

// ── AI Inventory Insights ─────────────────────────────────────────────────
const getAIInsights = async (req, res) => {
    try {
        const orderModel = (await import("../models/orderModel.js")).default;
        const foodModel  = (await import("../models/foodModel.js")).default;

        const [inventory, orders, foods] = await Promise.all([
            inventoryModel.find({ restaurantId: req.restaurantId, isActive: true }).lean(),
            orderModel.find({
                restaurantId: req.restaurantId,
                status: { $ne: "Cancelled" },
                createdAt: { $gte: new Date(Date.now() - 30 * 864e5) }
            }).select("items amount createdAt").lean(),
            foodModel.find({ restaurantId: req.restaurantId }).select("name category inStock").lean()
        ]);

        if (inventory.length === 0) {
            return res.json({ success: true, data: { message: "Add inventory items to unlock AI insights", items: [] } });
        }

        // ── Build order velocity per menu item (last 30 days) ──
        const menuVelocity = {};
        orders.forEach(o => (o.items || []).forEach(it => {
            const id = String(it._id);
            if (!menuVelocity[id]) menuVelocity[id] = { qty: 0, rev: 0 };
            menuVelocity[id].qty += (it.quantity || 1);
            menuVelocity[id].rev += (it.price || 0) * (it.quantity || 1);
        }));

        // ── Weekly order trend (4 weeks) ──
        const weekBuckets = [0, 0, 0, 0];
        const now = Date.now();
        orders.forEach(o => {
            const age = (now - new Date(o.createdAt).getTime()) / 864e5;
            const wk = Math.min(3, Math.floor(age / 7));
            weekBuckets[wk] += (o.amount || 0);
        });

        const revenueThisWeek = weekBuckets[0];
        const revenueLastWeek = weekBuckets[1];
        const revenueTrend = revenueLastWeek > 0
            ? Math.round(((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100)
            : 0;

        // ── Per-item AI analysis ──
        const totalDays = Math.max(1, Math.ceil((now - Math.min(...orders.map(o => new Date(o.createdAt).getTime()), now)) / 864e5));
        const analysisDays = Math.min(totalDays, 30);

        const insights = inventory.map(item => {
            const dailyUsageEstimate = (() => {
                // Heuristic: match inventory item name to menu items by keyword overlap
                const nameLower = item.itemName.toLowerCase();
                let matchedQty = 0;
                Object.entries(menuVelocity).forEach(([foodId, vel]) => {
                    const food = foods.find(f => String(f._id) === foodId);
                    if (!food) return;
                    const foodLower = (food.name + " " + food.category).toLowerCase();
                    // Simple keyword matching
                    const keywords = nameLower.split(/[\s,]+/).filter(w => w.length > 2);
                    const matches = keywords.some(kw => foodLower.includes(kw));
                    if (matches) matchedQty += vel.qty;
                });
                // Estimate: each order uses ~0.1-0.5 units of matched ingredient
                const factor = item.unit === "g" || item.unit === "ml" ? 50 : item.unit === "kg" || item.unit === "l" ? 0.2 : 1;
                return Math.round((matchedQty / analysisDays) * factor * 100) / 100;
            })();

            const daysUntilStockout = dailyUsageEstimate > 0
                ? Math.round(item.currentStock / dailyUsageEstimate)
                : item.currentStock > 0 ? 999 : 0;

            const suggestedReorderQty = dailyUsageEstimate > 0
                ? Math.ceil(dailyUsageEstimate * 14) // 2-week supply
                : item.maximumStock - item.currentStock;

            const reorderCost = Math.round(suggestedReorderQty * item.unitCost * 100) / 100;

            // Waste risk: items that may expire before being used up
            let wasteRisk = "none";
            let wasteDays = null;
            if (item.expiryDate) {
                const daysToExpiry = Math.ceil((new Date(item.expiryDate) - now) / 864e5);
                wasteDays = daysToExpiry;
                if (daysToExpiry <= 0) {
                    wasteRisk = "expired";
                } else if (dailyUsageEstimate > 0 && daysUntilStockout > daysToExpiry) {
                    wasteRisk = "high"; // stock will outlast expiry
                } else if (daysToExpiry <= 3) {
                    wasteRisk = "medium";
                }
            }

            // Urgency score (0-100)
            let urgency = 0;
            if (item.currentStock <= 0) urgency = 100;
            else if (item.currentStock <= item.minimumStock * 0.5) urgency = 90;
            else if (item.currentStock <= item.minimumStock) urgency = 70;
            else if (daysUntilStockout <= 3) urgency = 80;
            else if (daysUntilStockout <= 7) urgency = 50;
            else if (wasteRisk === "expired") urgency = 95;
            else if (wasteRisk === "high") urgency = 60;

            // AI recommendation
            let recommendation = "";
            if (urgency >= 90) recommendation = "Reorder immediately — critically low or expired stock.";
            else if (urgency >= 70) recommendation = "Reorder soon — stock is below minimum threshold.";
            else if (urgency >= 50) recommendation = "Plan to reorder this week — stock running low.";
            else if (wasteRisk === "high") recommendation = "Consider using in specials or promotions before expiry.";
            else if (item.currentStock >= item.maximumStock) recommendation = "Overstocked — hold off on reordering.";
            else recommendation = "Stock levels healthy. No action needed.";

            return {
                _id: item._id,
                itemName: item.itemName,
                category: item.category,
                unit: item.unit,
                currentStock: item.currentStock,
                minimumStock: item.minimumStock,
                maximumStock: item.maximumStock,
                unitCost: item.unitCost,
                dailyUsage: dailyUsageEstimate,
                daysUntilStockout,
                suggestedReorderQty,
                reorderCost,
                wasteRisk,
                wasteDays,
                urgency,
                recommendation,
                supplier: item.supplier,
                expiryDate: item.expiryDate,
                lastRestocked: item.lastRestocked
            };
        }).sort((a, b) => b.urgency - a.urgency);

        // ── Summary ──
        const criticalItems = insights.filter(i => i.urgency >= 70).length;
        const wasteRiskItems = insights.filter(i => i.wasteRisk === "high" || i.wasteRisk === "expired").length;
        const totalReorderCost = Math.round(insights.filter(i => i.urgency >= 50).reduce((s, i) => s + i.reorderCost, 0) * 100) / 100;
        const totalInventoryValue = Math.round(inventory.reduce((s, i) => s + i.currentStock * i.unitCost, 0) * 100) / 100;
        const healthScore = Math.max(0, Math.min(100, 100 - (criticalItems * 15) - (wasteRiskItems * 10)));

        // ── Smart tips ──
        const tips = [];
        if (criticalItems > 0) tips.push({ type: "danger", text: `${criticalItems} item${criticalItems > 1 ? "s" : ""} need${criticalItems === 1 ? "s" : ""} immediate restocking.` });
        if (wasteRiskItems > 0) tips.push({ type: "warning", text: `${wasteRiskItems} item${wasteRiskItems > 1 ? "s" : ""} at risk of expiring before use.` });
        if (revenueTrend > 15) tips.push({ type: "success", text: `Revenue up ${revenueTrend}% this week — consider stocking up on popular ingredients.` });
        if (revenueTrend < -15) tips.push({ type: "info", text: `Revenue down ${Math.abs(revenueTrend)}% this week — you may be able to delay some reorders.` });
        const overstocked = insights.filter(i => i.currentStock >= i.maximumStock);
        if (overstocked.length > 0) tips.push({ type: "info", text: `${overstocked.length} item${overstocked.length > 1 ? "s" : ""} overstocked. Check storage capacity.` });
        if (tips.length === 0) tips.push({ type: "success", text: "Inventory looks healthy! All stock levels are within range." });

        res.json({
            success: true,
            data: {
                items: insights,
                summary: {
                    totalItems: inventory.length,
                    criticalItems,
                    wasteRiskItems,
                    totalReorderCost,
                    totalInventoryValue,
                    healthScore,
                    revenueTrend,
                    ordersLast30: orders.length
                },
                tips
            }
        });
    } catch (error) {
        console.error("Error generating AI insights:", error);
        res.status(500).json({ success: false, message: "Failed to generate AI insights" });
    }
};

// ── Link a menu item to an inventory item ─────────────────────────────────
const linkMenuItem = async (req, res) => {
    try {
        const { id } = req.params;              // inventory item id
        const { foodId, quantityPerOrder } = req.body;

        if (!foodId || !quantityPerOrder || quantityPerOrder <= 0) {
            return res.status(400).json({ success: false, message: "foodId and a positive quantityPerOrder are required" });
        }

        const item = await inventoryModel.findOne({ _id: id, restaurantId: req.restaurantId });
        if (!item) return res.status(404).json({ success: false, message: "Inventory item not found" });

        const existing = item.linkedMenuItems?.find(l => String(l.foodId) === String(foodId));
        
        if (existing) {
            await inventoryModel.updateOne(
                { _id: id, "linkedMenuItems.foodId": foodId },
                { $set: { "linkedMenuItems.$.quantityPerOrder": Number(quantityPerOrder) } }
            );
        } else {
            await inventoryModel.updateOne(
                { _id: id },
                { $push: { linkedMenuItems: { foodId, quantityPerOrder: Number(quantityPerOrder) } } }
            );
        }
        
        const populated = await inventoryModel.findById(id).populate("linkedMenuItems.foodId", "name image price category");
        const rawFoodIds = (populated.linkedMenuItems || []).map(link => String(link.foodId?._id || link.foodId || ""));
        res.json({ success: true, message: "Menu item linked", data: serializeInventoryItem(populated, rawFoodIds) });
    } catch (error) {
        console.error("Error linking menu item:", error);
        res.status(500).json({ success: false, message: "Failed to link menu item" });
    }
};

// ── Sync ingredients for a menu item (called from Add/Edit Menu) ──────────
const syncFoodIngredients = async (req, res) => {
    try {
        const { foodId, ingredients } = req.body; // ingredients: [{ inventoryId, quantityPerOrder }]
        const restaurantId = req.restaurantId;

        if (!foodId || !Array.isArray(ingredients)) {
            return res.status(400).json({ success: false, message: "foodId and ingredients array required" });
        }

        // 1. Remove this foodId from ALL inventory items for this restaurant
        await inventoryModel.updateMany(
            { restaurantId, "linkedMenuItems.foodId": foodId },
            { $pull: { linkedMenuItems: { foodId: foodId } } }
        );

        // 2. Add the new links to the specified inventory items
        for (const ing of ingredients) {
            if (!ing.inventoryId || !ing.quantityPerOrder) continue;
            
            await inventoryModel.updateOne(
                { _id: ing.inventoryId, restaurantId },
                { $push: { linkedMenuItems: { foodId: foodId, quantityPerOrder: Number(ing.quantityPerOrder) } } }
            );
        }

        res.json({ success: true, message: "Ingredients synchronized with menu item" });
    } catch (error) {
        console.error("Error syncing food ingredients:", error);
        res.status(500).json({ success: false, message: "Failed to sync ingredients" });
    }
};

// ── Get ingredients linked to a specific food item ──────────────────────────
const getFoodIngredients = async (req, res) => {
    try {
        const { foodId } = req.params;
        const restaurantId = req.restaurantId;

        const inventoryItems = await inventoryModel.find({
            restaurantId,
            isActive: true,
            "linkedMenuItems.foodId": foodId
        }).select("itemName unit currentStock linkedMenuItems");

        const ingredients = inventoryItems.map(item => {
            const link = item.linkedMenuItems.find(l => String(l.foodId) === String(foodId));
            return {
                inventoryId: item._id,
                itemName: item.itemName,
                unit: item.unit,
                currentStock: item.currentStock,
                quantityPerOrder: link?.quantityPerOrder || 0
            };
        });

        res.json({ success: true, data: ingredients });
    } catch (error) {
        console.error("Error fetching food ingredients:", error);
        res.status(500).json({ success: false, message: "Failed to fetch ingredients" });
    }
};

// ── Sync ALL missing or incorrect menu links for the restaurant ───────────
const syncAllLinks = async (req, res) => {
    try {
        const foodModel = (await import("../models/foodModel.js")).default;
        const menuFoods = await foodModel.find({ restaurantId: req.restaurantId }).select("name ingredients description").lean();
        // --- STEP 0: Smart Cleanup & Deduplication ---
        // If we have items with exact same name, merge their links and delete duplicates
        const allInventory = await inventoryModel.find({ restaurantId: req.restaurantId, isActive: true });
        const nameMap = new Map();
        for (const item of allInventory) {
            const lowerLabel = String(item.itemName || "").toLowerCase().trim();
            if (!nameMap.has(lowerLabel)) {
                nameMap.set(lowerLabel, item);
            } else {
                const existing = nameMap.get(lowerLabel);
                // Merge links from duplicate to existing
                if (item.linkedMenuItems && item.linkedMenuItems.length > 0) {
                    const currentLinks = new Set(existing.linkedMenuItems.map(l => String(l.foodId?._id || l.foodId || "")));
                    for (const link of item.linkedMenuItems) {
                        const foodIdStr = String(link.foodId?._id || link.foodId || "");
                        if (!currentLinks.has(foodIdStr) && foodIdStr) {
                            existing.linkedMenuItems.push(link);
                        }
                    }
                    await existing.save();
                }
                // Mark duplicate for deletion
                await inventoryModel.findByIdAndDelete(item._id);
                console.log(`[sync] Merged and deleted duplicate inventory: ${item.itemName}`);
            }
        }
        
        // Refresh items after cleanup
        const cleanInventory = await inventoryModel.find({ restaurantId: req.restaurantId, isActive: true });
        
        let syncedCount = 0;
        let repairedCount = 0;

        for (const item of cleanInventory) {
            let changed = false;
            
            // 1. Repair existing links that are stuck at 1
            if (item.linkedMenuItems && item.linkedMenuItems.length > 0) {
                for (const link of item.linkedMenuItems) {
                    if (link.quantityPerOrder === 1) {
                        const food = menuFoods.find(f => String(f._id) === String(link.foodId));
                        if (food) {
                            const correctQty = extractQuantityFromName(food.name);
                            if (correctQty > 1) {
                                link.quantityPerOrder = correctQty;
                                repairedCount++;
                                changed = true;
                            }
                        }
                    }
                }
            }

            // 2. Identify if we need to sync:
            // - It has no links
            // - It has too many links (explosion)
            // - It has 1 link but the quantity seems wrong (e.g. dish says "15pcs" but link says "1")
            let needsSync = !item.linkedMenuItems || item.linkedMenuItems.length === 0 || excessiveLinks;
            
            if (!needsSync && item.linkedMenuItems.length > 0) {
                for (const link of item.linkedMenuItems) {
                    const dishName = link.foodId?.name || "";
                    const detectedQty = extractQuantityFromName(dishName);
                    if (detectedQty !== link.quantityPerOrder) {
                        needsSync = true;
                        break;
                    }
                }
            }
            
            if (needsSync) {
                const itemName = item.itemName.toLowerCase().trim();
                const normalizedSearch = itemName
                    .replace(/potatoe|potos|potat/gi, "potato")
                    .replace(/s\b|es\b/gi, "")
                    .trim();

                const matches = menuFoods.filter(f => {
                    const fName = (f.name || "").toLowerCase();
                    const fIngsRaw = (f.ingredients || "").toLowerCase();
                    
                    // Normalize dish name for better matching (handles plurals like Potatoes -> Potato)
                    const fNameNorm = fName
                        .replace(/potatoe|potos|potat/gi, "potato")
                        .replace(/s\b|es\b/gi, "")
                        .trim();

                    const DISH_KEYWORDS = ["combo", "meal", "bucket", "deal", "offer", "pack", "sandwich", "burger", "pizza", "platter", "feast", "box"];
                    const isLikelyDish = DISH_KEYWORDS.some(k => itemName.includes(k));

                    // Priority 1: High Confidence - Ingredient String Match (ALWAYS ALLOW)
                    if (fIngsRaw.includes(normalizedSearch)) return true;

                    // Priority 2: Medium Confidence - Exact Name Match
                    if (fNameNorm === normalizedSearch || fName === itemName) return true;

                    // Priority 3: Partial Match - ONLY IF IT'S NOT A DISH NAME
                    // (But allow if it's explicitly a food_ingredient category)
                    if (isLikelyDish && item.category !== 'food_ingredient') return false;

                    // Final check: Two-way fuzzy match with word boundaries or inclusion
                    const boundaryRegex = new RegExp(`\\b${normalizedSearch}\\b`, 'i');
                    return boundaryRegex.test(fNameNorm) || 
                           fNameNorm.includes(normalizedSearch) || 
                           normalizedSearch.includes(fNameNorm); // TWO-WAY match
                });

                // If we found reliable matches, update. 
                // IF we were repairing an "explosion" and found 0 reliable matches, clear it!
                if (matches.length < 15) {
                    const newLinks = matches.map(m => ({ 
                        foodId: m._id, 
                        quantityPerOrder: extractQuantityFromName(m.name) 
                    }));
                    item.linkedMenuItems = newLinks;
                    syncedCount++;
                    changed = true;
                } else if (matches.length >= 15 && excessiveLinks) {
                    // Still too many matches, do nothing to avoid pollution
                }
            }

            if (changed) {
                await item.save();
            }
        }

        res.json({ 
            success: true, 
            message: `Sync complete! Synced ${syncedCount} new items and repaired ${repairedCount} existing links.`,
            syncedCount,
            repairedCount
        });
    } catch (error) {
        console.error("Error syncing all links:", error);
        res.status(500).json({ success: false, message: "Failed to sync links" });
    }
};

// ── Unlink a menu item from an inventory item ─────────────────────────────
const unlinkMenuItem = async (req, res) => {
    try {
        const { id } = req.params;              // inventory item id
        const { foodId } = req.body;

        if (!foodId) return res.status(400).json({ success: false, message: "foodId is required" });

        const item = await inventoryModel.findOne({ _id: id, restaurantId: req.restaurantId });
        if (!item) return res.status(404).json({ success: false, message: "Inventory item not found" });

        await inventoryModel.updateOne(
            { _id: id },
            { $pull: { linkedMenuItems: { foodId: foodId } } }
        );

        res.json({ success: true, message: "Menu item unlinked" });
    } catch (error) {
        console.error("Error unlinking menu item:", error);
        res.status(500).json({ success: false, message: "Failed to unlink menu item" });
    }
};

// ── Get restaurant's menu items (for linking UI) ──────────────────────────
const getRestaurantFoods = async (req, res) => {
    try {
        const foodModel = (await import("../models/foodModel.js")).default;
        const foods = await foodModel
            .find({ restaurantId: req.restaurantId })
            .select("name image price category inStock ingredients description")
            .sort({ name: 1 })
            .lean();
        res.json({ success: true, data: foods });
    } catch (error) {
        console.error("Error fetching restaurant foods:", error);
        res.status(500).json({ success: false, message: "Failed to fetch menu items" });
    }
};

const deductInventoryForOrder = async (restaurantId, orderItems, orderId) => {
    try {
        console.log(`[inventory][deduct] Starting deduction for order ${orderId} (restaurant: ${restaurantId})`);
        if (!orderItems || orderItems.length === 0) {
            console.log(`[inventory][deduct] No items in order to deduct.`);
            return { success: true, message: "No items to deduct" };
        }

        // Build a map of foodId -> quantity ordered
        const orderedMap = {};
        for (const oi of orderItems) {
            // Check all possible ID fields (Mongoose _id, or flat foodId)
            const idSource = oi._id || oi.foodId || oi.id;
            if (!idSource) {
                console.warn(`[inventory][deduct] Item in order ${orderId} missing ID:`, oi.name);
                continue;
            }
            const key = String(idSource);
            orderedMap[key] = (orderedMap[key] || 0) + (Number(oi.quantity) || 0);
        }

        console.log(`[inventory][deduct] Ordered Items Map:`, orderedMap);

        const inventoryItems = await inventoryModel.find({
            restaurantId,
            isActive: true,
            "linkedMenuItems.0": { $exists: true }
        });

        console.log(`[inventory][deduct] Found ${inventoryItems.length} inventory items with links.`);

        const deductionResults = [];

        for (const inv of inventoryItems) {
            let invCurrentStock = Number(inv.currentStock) || 0;
            let totalDeductionForThisItem = 0;
            const itemLogs = [];

            for (const link of inv.linkedMenuItems) {
                // Ensure we get the raw ID string
                const foodKey = String(link.foodId?._id || link.foodId || "");
                const qtyOrdered = Number(orderedMap[foodKey] || 0);
                
                if (!qtyOrdered) continue;
                if (Number(link.quantityPerOrder) <= 0) {
                    console.warn(`[inventory][deduct] Invalid link qty for ${inv.itemName} -> ${foodKey}`);
                    continue;
                }

                const linkQtyPerOrder = Number(link.quantityPerOrder);
                const qtyToDeduct = Number((qtyOrdered * linkQtyPerOrder).toFixed(4));
                
                totalDeductionForThisItem += qtyToDeduct;
                itemLogs.push({
                    orderId: orderId || "unknown",
                    foodId: foodKey,
                    foodName: orderItems.find(oi => String(oi._id || oi.foodId || oi.id) === foodKey)?.name || "Unknown Item",
                    qtyOrdered,
                    qtyDeducted: qtyToDeduct,
                    stockBefore: invCurrentStock - (totalDeductionForThisItem - qtyToDeduct),
                    stockAfter: invCurrentStock - totalDeductionForThisItem,
                    date: new Date()
                });

                deductionResults.push({
                    inventoryItem: inv.itemName,
                    foodId: foodKey,
                    qtyDeducted: qtyToDeduct
                });
            }

            // Apply the total deduction for this inventory item in one go
            if (totalDeductionForThisItem > 0) {
                const stockBefore = inv.currentStock;
                const stockAfter = Math.max(0, stockBefore - totalDeductionForThisItem);

                await inventoryModel.findByIdAndUpdate(inv._id, {
                    currentStock: stockAfter,
                    $push: {
                        deductionLog: {
                            $each: itemLogs,
                            $slice: -100
                        }
                    }
                });
                console.log(`[inventory][deduct] Successfully deducted ${totalDeductionForThisItem} from ${inv.itemName} (${stockBefore} -> ${stockAfter})`);
            }
        }

        if (deductionResults.length === 0) {
            console.log(`[inventory][deduct] No deduction was needed for this order (no linked ingredients found in maps).`);
        } else {
            console.log(`[inventory][deduct] Completed ${deductionResults.length} deductions for order ${orderId}`);
        }
        
        // Mark order as deducted in DB
        if (orderId && orderId !== "unknown") {
            try {
                const orderModel = (await import("../models/orderModel.js")).default;
                await orderModel.findByIdAndUpdate(orderId, { inventoryDeducted: true });
            } catch (e) {
                console.error("[inventory][deduct] Failed to update flag on orderDoc:", e.message);
            }
        }

        return { success: true, message: "Inventory deduction completed", deductions: deductionResults };
    } catch (error) {
        console.error("[inventory][deduct] FATAL ERROR during deduction:", error);
        return { success: false, message: "Failed to deduct inventory", error: error.message };
    }
};

// ── Get deduction history for an inventory item ───────────────────────────
const getDeductionLog = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await inventoryModel
            .findOne({ _id: id, restaurantId: req.restaurantId })
            .select("itemName deductionLog")
            .lean();
        if (!item) return res.status(404).json({ success: false, message: "Item not found" });
        res.json({ success: true, data: { itemName: item.itemName, log: (item.deductionLog || []).reverse() } });
    } catch (error) {
        console.error("Error fetching deduction log:", error);
        res.status(500).json({ success: false, message: "Failed to fetch log" });
    }
};

// ── Restore Inventory for Cancelled Orders ───────────────────────────────
const restoreInventoryForCancelledOrder = async (restaurantId, orderItems, orderId) => {
    try {
        if (!orderItems || orderItems.length === 0) {
            return { success: true, message: "No items to restore" };
        }

        // Build a map of foodId -> quantity ordered
        const orderedMap = {};
        for (const oi of orderItems) {
            const fid = oi._id || oi.foodId;
            if (!fid) continue;
            const key = String(fid);
            orderedMap[key] = (orderedMap[key] || 0) + (Number(oi.quantity) || 0);
        }

        // Find inventory items that have deductions for this order
        const inventoryItems = await inventoryModel.find({
            restaurantId,
            isActive: true,
            "deductionLog.orderId": orderId,
            "deductionLog.reverted": { $ne: true }
        });

        if (inventoryItems.length === 0) {
            return { success: true, message: "No inventory deductions found for this order" };
        }

        const restorationResults = [];

        for (const inv of inventoryItems) {
            let invCurrentStock = Number(inv.currentStock) || 0;
            let totalRestored = 0;

            // Process each linked menu item
            for (const link of inv.linkedMenuItems) {
                const foodKey = String(link.foodId?._id || link.foodId || "");
                const qtyOrdered = Number(orderedMap[foodKey] || 0);
                if (!qtyOrdered || Number(link.quantityPerOrder) <= 0) continue;

                const linkQtyPerOrder = Number(link.quantityPerOrder);
                const qtyToRestore = Number((qtyOrdered * linkQtyPerOrder).toFixed(4));
                
                // Find and mark deduction entries as reverted
                const deductionEntries = inv.deductionLog.filter(log => 
                    log.orderId === orderId && 
                    String(log.foodId) === foodKey && 
                    !log.reverted
                );

                for (const entry of deductionEntries) {
                    entry.reverted = true;
                    entry.revertedAt = new Date();
                    entry.restoredQty = qtyToRestore;
                }

                invCurrentStock += qtyToRestore;
                totalRestored += qtyToRestore;

                restorationResults.push({
                    inventoryItem: inv.itemName,
                    inventoryId: inv._id,
                    foodId: foodKey,
                    qtyOrdered,
                    qtyRestored: qtyToRestore,
                    stockBefore: invCurrentStock - qtyToRestore,
                    stockAfter: invCurrentStock,
                    success: true
                });
            }

            // Update inventory item with restored stock and updated deduction log
            await inventoryModel.findByIdAndUpdate(inv._id, {
                currentStock: invCurrentStock,
                deductionLog: inv.deductionLog,
                $push: {
                    restorationLog: {
                        orderId: orderId || "unknown",
                        totalRestored,
                        restoredAt: new Date(),
                        reason: "Order cancelled"
                    }
                }
            });
        }

        console.log(`[inventory] Restored ${restorationResults.length} entries for cancelled order ${orderId || "?"}`);
        
        // Mark order as NOT deducted
        if (orderId && orderId !== "unknown") {
            try {
                const orderModel = (await import("../models/orderModel.js")).default;
                await orderModel.findByIdAndUpdate(orderId, { inventoryDeducted: false });
            } catch (e) {
                console.error("[inventory] Failed to update order inventoryDeducted flag:", e);
            }
        }

        return { 
            success: true, 
            message: "Inventory restoration completed", 
            restorations: restorationResults 
        };
    } catch (error) {
        console.error("Error restoring inventory:", error);
        return { success: false, message: "Failed to restore inventory", error: error.message };
    }
};

// ── Preview inventory deduction for a hypothetical order without writing changes
const previewInventoryDeduction = async (req, res) => {
    try {
        const { restaurantId, items } = req.body;
        if (!restaurantId || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "restaurantId and items are required" });
        }

        const orderedMap = {};
        for (const oi of items) {
            const fid = oi._id || oi.foodId;
            if (!fid) continue;
            orderedMap[String(fid)] = (orderedMap[String(fid)] || 0) + (Number(oi.quantity) || 0);
        }

        const inventoryItems = await inventoryModel.find({ restaurantId, isActive: true, "linkedMenuItems.0": { $exists: true } });
        const preview = [];

        for (const inv of inventoryItems) {
            let currentStock = Number(inv.currentStock) || 0;
            for (const link of inv.linkedMenuItems) {
                const orderedQty = Number(orderedMap[String(link.foodId)] || 0);
                if (!orderedQty || Number(link.quantityPerOrder) <= 0) continue;
                const qtyDeduct = Number((orderedQty * link.quantityPerOrder).toFixed(4));
                preview.push({
                    inventoryItem: inv.itemName,
                    inventoryId: inv._id,
                    foodId: link.foodId,
                    qtyOrdered: orderedQty,
                    qtyDeducted: qtyDeduct,
                    stockBefore: currentStock,
                    stockAfter: Math.max(0, currentStock - qtyDeduct)
                });
                currentStock = Math.max(0, currentStock - qtyDeduct);
            }
        }

        res.json({ success: true, data: preview });
    } catch (error) {
        console.error("Error generating deduction preview:", error);
        res.status(500).json({ success: false, message: "Failed to generate preview" });
    }
};

// ── ANALYTICS ENDPOINTS ────────────────────────────────────────────────────

// Get inventory value analytics with trends
const getInventoryAnalytics = async (req, res) => {
    try {
        const { timeframe = "30d" } = req.query;
        
        // Validate timeframe
        const validTimeframes = ["7d", "30d", "60d", "90d", "1y"];
        if (!validTimeframes.includes(timeframe)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid timeframe. Must be one of: 7d, 30d, 60d, 90d, 1y" 
            });
        }

        // Map timeframe to days
        const timeframeMap = { "7d": 7, "30d": 30, "60d": 60, "90d": 90, "1y": 365 };
        const days = timeframeMap[timeframe];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Get current inventory snapshot
        const currentInventory = await inventoryModel
            .find({ restaurantId: req.restaurantId, isActive: true })
            .select("itemName category unit currentStock unitCost minimumStock maximumStock deductionLog")
            .lean();

        if (!currentInventory.length) {
            return res.json({
                success: true,
                data: {
                    current: {
                        totalValue: 0,
                        totalItems: 0,
                        totalUnits: 0,
                        byCategory: []
                    },
                    history: [],
                    summary: {
                        timeframe,
                        avgDailyUsage: 0,
                        totalDaysTracked: 0,
                        projectedMonthlyUsage: 0
                    }
                }
            });
        }

        // Calculate current analytics
        const byCategory = {};
        let totalValue = 0;
        let totalItems = 0;
        let totalUnits = 0;

        currentInventory.forEach(item => {
            const itemValue = item.currentStock * item.unitCost;
            totalValue += itemValue;
            totalItems += 1;
            totalUnits += item.currentStock;

            if (!byCategory[item.category]) {
                byCategory[item.category] = { value: 0, items: 0, units: 0 };
            }
            byCategory[item.category].value += itemValue;
            byCategory[item.category].items += 1;
            byCategory[item.category].units += item.currentStock;
        });

        // Calculate usage trends from deduction logs
        const usageByDay = {};
        const dailyDeductions = {};

        currentInventory.forEach(item => {
            (item.deductionLog || [])
                .filter(log => new Date(log.date) >= startDate)
                .forEach(log => {
                    const day = new Date(log.date).toISOString().split('T')[0];
                    if (!dailyDeductions[day]) dailyDeductions[day] = 0;
                    dailyDeductions[day] += log.qtyDeducted * item.unitCost;
                });
        });

        // Generate sorted history points
        const history = [];
        let currentDate = new Date(startDate);
        while (currentDate <= new Date()) {
            const day = currentDate.toISOString().split('T')[0];
            history.push({
                date: day,
                usage: dailyDeductions[day] || 0
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Calculate summary metrics
        const avgDailyUsage = history.length > 0 
            ? Math.round((history.reduce((s, h) => s + h.usage, 0) / history.length) * 100) / 100
            : 0;

        res.json({
            success: true,
            data: {
                current: {
                    totalValue: Math.round(totalValue * 100) / 100,
                    totalItems,
                    totalUnits: Math.round(totalUnits * 100) / 100,
                    byCategory: Object.entries(byCategory).map(([cat, data]) => ({
                        category: cat,
                        value: Math.round(data.value * 100) / 100,
                        items: data.items,
                        units: Math.round(data.units * 100) / 100,
                        percentage: Math.round((data.value / totalValue) * 100)
                    })).sort((a, b) => b.value - a.value)
                },
                history: history.slice(-30), // Last 30 days
                summary: {
                    timeframe,
                    avgDailyUsage,
                    totalDaysTracked: history.length,
                    projectedMonthlyUsage: Math.round(avgDailyUsage * 30 * 100) / 100
                }
            }
        });
    } catch (error) {
        console.error("Error fetching inventory analytics:", error);
        res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
};

// Get stock turnover rates by category
const getStockTurnoverAnalytics = async (req, res) => {
    try {
        const { timeframe = "30d" } = req.query;
        
        // Validate timeframe
        const validTimeframes = ["7d", "30d", "60d", "90d"];
        if (!validTimeframes.includes(timeframe)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid timeframe. Must be one of: 7d, 30d, 60d, 90d" 
            });
        }

        const timeframeMap = { "7d": 7, "30d": 30, "60d": 60, "90d": 90 };
        const days = timeframeMap[timeframe];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const inventory = await inventoryModel
            .find({ restaurantId: req.restaurantId, isActive: true })
            .select("category itemName currentStock unitCost deductionLog")
            .lean();

        const byCategory = {};

        inventory.forEach(item => {
            if (!byCategory[item.category]) {
                byCategory[item.category] = {
                    category: item.category,
                    items: [],
                    totalUsed: 0,
                    totalValue: 0
                };
            }

            const usedQty = (item.deductionLog || [])
                .filter(log => new Date(log.date) >= startDate)
                .reduce((sum, log) => sum + log.qtyDeducted, 0);

            const usedValue = usedQty * item.unitCost;
            const turnoverRate = item.currentStock > 0 ? Math.round((usedQty / (usedQty + item.currentStock)) * 100) : 0;

            byCategory[item.category].items.push({
                name: item.itemName,
                usedQty: Math.round(usedQty * 100) / 100,
                usedValue: Math.round(usedValue * 100) / 100,
                currentStock: item.currentStock,
                turnoverRate,
                efficiency: turnoverRate > 70 ? "high" : turnoverRate > 40 ? "medium" : "low"
            });

            byCategory[item.category].totalUsed += usedQty;
            byCategory[item.category].totalValue += usedValue;
        });

        const results = Object.values(byCategory).map(cat => ({
            ...cat,
            avgTurnover: cat.items.length > 0 
                ? Math.round((cat.items.reduce((s, i) => s + i.turnoverRate, 0) / cat.items.length))
                : 0,
            items: cat.items.sort((a, b) => b.turnoverRate - a.turnoverRate)
        }));

        res.json({
            success: true,
            data: results.sort((a, b) => b.avgTurnover - a.avgTurnover)
        });
    } catch (error) {
        console.error("Error fetching turnover analytics:", error);
        res.status(500).json({ success: false, message: "Failed to fetch turnover analytics" });
    }
};

// Get supplier performance analytics
const getSupplierAnalytics = async (req, res) => {
    try {
        const inventory = await inventoryModel
            .find({ 
                restaurantId: req.restaurantId, 
                isActive: true,
                "supplier.name": { $exists: true, $ne: "" }
            })
            .select("itemName supplier unitCost currentStock expiryDate lastRestocked")
            .lean();

        const bySupplier = {};

        inventory.forEach(item => {
            const supplierName = item.supplier?.name || "Unknown";
            if (!bySupplier[supplierName]) {
                bySupplier[supplierName] = {
                    name: supplierName,
                    contact: item.supplier?.contact || "",
                    email: item.supplier?.email || "",
                    items: [],
                    totalValue: 0,
                    itemCount: 0,
                    avgLeadTime: 0,
                    qualityScore: 100
                };
            }

            const itemValue = item.currentStock * item.unitCost;
            bySupplier[supplierName].items.push({
                name: item.itemName,
                value: Math.round(itemValue * 100) / 100,
                stock: item.currentStock,
                expiryDate: item.expiryDate,
                lastRestocked: item.lastRestocked
            });

            bySupplier[supplierName].totalValue += itemValue;
            bySupplier[supplierName].itemCount += 1;

            // Simple quality score based on expiry issues
            if (item.expiryDate) {
                const daysToExpiry = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                if (daysToExpiry < 0) bySupplier[supplierName].qualityScore -= 10;
                else if (daysToExpiry < 7) bySupplier[supplierName].qualityScore -= 5;
            }
        });

        const results = Object.values(bySupplier).map(supplier => ({
            ...supplier,
            totalValue: Math.round(supplier.totalValue * 100) / 100,
            qualityScore: Math.max(0, supplier.qualityScore),
            items: supplier.items.sort((a, b) => b.value - a.value)
        })).sort((a, b) => b.totalValue - a.totalValue);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error("Error fetching supplier analytics:", error);
        res.status(500).json({ success: false, message: "Failed to fetch supplier analytics" });
    }
};

// Get paginated inventory with advanced filtering
const getInventoryPaginated = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            category = "all", 
            search = "",
            sortBy = "name",
            status = "all"
        } = req.query;

        // Validate pagination params
        const pageNum = Math.max(1, parseInt(page) || 1);
        const pageLimit = Math.min(500, parseInt(limit) || 200); // Increased default limit for better bulk management
        const skip = (pageNum - 1) * pageLimit;

        // Build filter
        const filter = { 
            restaurantId: req.restaurantId,
            isActive: true
        };

        // Validate category
        const validCategories = ["food_ingredient", "beverage", "packaging", "equipment", "other"];
        if (category !== "all" && validCategories.includes(category)) {
            filter.category = category;
        }

        // Build search filter
        if (search && typeof search === "string" && search.trim()) {
            filter.itemName = { $regex: search.trim(), $options: "i" };
        }

        // Build sort
        const sortMap = {
            name: { itemName: 1 },
            stock_high: { currentStock: -1 },
            stock_low: { currentStock: 1 },
            value: { currentStock: -1, unitCost: -1 },
            recent: { lastRestocked: -1 },
            expensive: { unitCost: -1 }
        };
        const sortOptions = sortMap[sortBy] || sortMap.name;

        // Execute queries in parallel
        const [items, total] = await Promise.all([
            inventoryModel
                .find(filter)
                .select("itemName category unit currentStock minimumStock maximumStock unitCost supplier expiryDate lastRestocked linkedMenuItems")
                .sort(sortOptions)
                .skip(skip)
                .limit(pageLimit)
                .lean(),
            inventoryModel.countDocuments(filter)
        ]);

        // Add computed fields
        const enrichedItems = items.map(item => {
            const itemValue = item.currentStock * (item.unitCost || 0);
            let statusBadge = "normal";
            if (item.currentStock <= 0) statusBadge = "critical";
            else if (item.currentStock <= item.minimumStock) statusBadge = "low";
            else if (item.currentStock >= item.maximumStock) statusBadge = "high";

            return {
                ...item,
                value: Math.round(itemValue * 100) / 100,
                status: statusBadge,
                linkedCount: (item.linkedMenuItems || []).length
            };
        });

        res.json({
            success: true,
            data: enrichedItems,
            pagination: {
                page: pageNum,
                limit: pageLimit,
                total,
                pages: Math.ceil(total / pageLimit),
                hasMore: skip + pageLimit < total
            }
        });
    } catch (error) {
        console.error("Error fetching paginated inventory:", error);
        res.status(500).json({ success: false, message: "Failed to fetch inventory" });
    }
};

// Get cost analysis
const getCostAnalysis = async (req, res) => {
    try {
        const inventory = await inventoryModel
            .find({ restaurantId: req.restaurantId, isActive: true })
            .select("itemName category currentStock unitCost deductionLog")
            .lean();

        const analysis = {
            current: {
                totalCapitalInvested: 0,
                averageUnitCost: 0,
                highestCostItems: [],
                lowestCostItems: []
            },
            usage: {
                totalCostUsed: 0,
                avgCostPerDay: 0,
                costByCategory: {}
            }
        };

        const allCosts = [];
        const categoryCosts = {};

        inventory.forEach(item => {
            const itemValue = item.currentStock * item.unitCost;
            allCosts.push({ name: item.itemName, cost: item.unitCost });
            analysis.current.totalCapitalInvested += itemValue;

            if (!categoryCosts[item.category]) {
                categoryCosts[item.category] = { total: 0, items: 0, avgUnitCost: 0 };
            }
            categoryCosts[item.category].total += itemValue;
            categoryCosts[item.category].items += 1;
            categoryCosts[item.category].avgUnitCost = categoryCosts[item.category].total / categoryCosts[item.category].items;

            // Calculate usage cost
            const usedQty = (item.deductionLog || []).reduce((sum, log) => sum + log.qtyDeducted, 0);
            analysis.usage.totalCostUsed += usedQty * item.unitCost;
        });

        analysis.current.totalCapitalInvested = Math.round(analysis.current.totalCapitalInvested * 100) / 100;
        analysis.current.averageUnitCost = allCosts.length > 0
            ? Math.round((allCosts.reduce((s, c) => s + c.cost, 0) / allCosts.length) * 100) / 100
            : 0;
        analysis.current.highestCostItems = allCosts
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 5)
            .map(c => ({ name: c.name, cost: c.cost }));
        analysis.current.lowestCostItems = allCosts
            .sort((a, b) => a.cost - b.cost)
            .slice(0, 5)
            .map(c => ({ name: c.name, cost: c.cost }));

        analysis.usage.totalCostUsed = Math.round(analysis.usage.totalCostUsed * 100) / 100;
        analysis.usage.costByCategory = Object.entries(categoryCosts).map(([cat, data]) => ({
            category: cat,
            totalValue: Math.round(data.total * 100) / 100,
            items: data.items,
            avgUnitCost: Math.round(data.avgUnitCost * 100) / 100
        })).sort((a, b) => b.totalValue - a.totalValue);

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error("Error fetching cost analysis:", error);
        res.status(500).json({ success: false, message: "Failed to fetch cost analysis" });
    }
};

// ── Get all deduction logs for the restaurant ──────────────────────────────
const getAllDeductionLogs = async (req, res) => {
    try {
        const inventoryItems = await inventoryModel.find({ restaurantId: req.restaurantId }).select("itemName deductionLog unit").lean();
        
        const allLogs = [];
        inventoryItems.forEach(item => {
            if (item.deductionLog && item.deductionLog.length > 0) {
                item.deductionLog.forEach(log => {
                    allLogs.push({
                        ...log,
                        itemName: item.itemName,
                        unit: item.unit,
                        itemId: item._id
                    });
                });
            }
        });

        // Sort by date descending
        allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            data: allLogs.slice(0, 50) // Return last 50 logs
        });
    } catch (error) {
        console.error("Error getting all deduction logs:", error);
        res.status(500).json({ success: false, message: "Failed to get deduction logs" });
    }
};

export {
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
    deductInventoryForOrder,
    restoreInventoryForCancelledOrder,
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
    getCostAnalysis,
    syncAllLinks
};
