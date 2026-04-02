import inventoryModel from "../models/inventoryModel.js";

// ── Get all inventory items for restaurant ────────────────────────────────
const getInventory = async (req, res) => {
    try {
        // Get inventory items with limited populate for better performance
        const items = await inventoryModel
            .find({ restaurantId: req.restaurantId, isActive: true })
            .populate("linkedMenuItems.foodId", "name image price category")
            .sort({ createdAt: -1 })
            .lean();

        // Calculate stock status for each item
        const itemsWithStatus = items.map(item => {
            let status = "normal";
            let statusMessage = "Stock level normal";

            if (item.currentStock <= item.minimumStock) {
                status = "low";
                statusMessage = `Low stock - ${item.currentStock} ${item.unit} remaining`;
            } else if (item.currentStock >= item.maximumStock) {
                status = "high";
                statusMessage = `Overstock - ${item.currentStock} ${item.unit} in stock`;
            }

            // Check expiry
            let expiryStatus = "safe";
            if (item.expiryDate) {
                const daysUntilExpiry = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                if (daysUntilExpiry <= 0) {
                    expiryStatus = "expired";
                } else if (daysUntilExpiry <= 7) {
                    expiryStatus = "expiring_soon";
                }
            }

            return {
                ...item,
                status,
                statusMessage,
                expiryStatus,
                daysUntilExpiry: item.expiryDate ? Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null
            };
        });

        // Summary stats
        const summary = {
            totalItems: items.length,
            lowStock: itemsWithStatus.filter(i => i.status === "low").length,
            expired: itemsWithStatus.filter(i => i.expiryStatus === "expired").length,
            expiringSoon: itemsWithStatus.filter(i => i.expiryStatus === "expiring_soon").length,
            totalValue: items.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0)
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

        const newItem = new inventoryModel({
            restaurantId: req.restaurantId,
            itemName,
            category,
            unit,
            currentStock: Number(currentStock),
            minimumStock: Number(minimumStock) || 10,
            maximumStock: Number(maximumStock) || 100,
            unitCost: Number(unitCost) || 0,
            supplier: supplier ? JSON.parse(supplier) : {},
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            notes,
            lastRestocked: new Date()
        });

        await newItem.save();

        res.json({
            success: true,
            message: "Inventory item added successfully",
            data: newItem
        });
    } catch (error) {
        console.error("Error adding inventory item:", error);
        res.status(500).json({ success: false, message: "Failed to add inventory item" });
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

        // Soft delete by setting isActive to false
        await inventoryModel.findByIdAndUpdate(id, { isActive: false });

        res.json({
            success: true,
            message: "Inventory item removed successfully"
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
        const result = await inventoryModel.updateMany(
            { _id: { $in: ids }, restaurantId: req.restaurantId },
            { isActive: false }
        );
        res.json({
            success: true,
            message: `${result.modifiedCount} item${result.modifiedCount !== 1 ? "s" : ""} removed successfully`,
            count: result.modifiedCount
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

        // Check if already linked
        const existing = item.linkedMenuItems.find(l => String(l.foodId) === String(foodId));
        if (existing) {
            existing.quantityPerOrder = Number(quantityPerOrder);
        } else {
            item.linkedMenuItems.push({ foodId, quantityPerOrder: Number(quantityPerOrder) });
        }

        await item.save();
        const populated = await inventoryModel.findById(id).populate("linkedMenuItems.foodId", "name image price category");
        res.json({ success: true, message: "Menu item linked", data: populated });
    } catch (error) {
        console.error("Error linking menu item:", error);
        res.status(500).json({ success: false, message: "Failed to link menu item" });
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

        item.linkedMenuItems = item.linkedMenuItems.filter(l => String(l.foodId) !== String(foodId));
        await item.save();

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
            .select("name image price category inStock")
            .sort({ name: 1 })
            .lean();
        res.json({ success: true, data: foods });
    } catch (error) {
        console.error("Error fetching restaurant foods:", error);
        res.status(500).json({ success: false, message: "Failed to fetch menu items" });
    }
};

// ── Automatic Inventory Deduction for Orders ───────────────────────────────
const deductInventoryForOrder = async (restaurantId, orderItems, orderId) => {
    try {
        if (!orderItems || orderItems.length === 0) {
            return { success: true, message: "No items to deduct" };
        }

        // Build a map of foodId -> quantity ordered
        const orderedMap = {};
        for (const oi of orderItems) {
            const fid = oi._id || oi.foodId;
            if (!fid) continue;
            const key = String(fid);
            orderedMap[key] = (orderedMap[key] || 0) + (Number(oi.quantity) || 0);
        }

        const inventoryItems = await inventoryModel.find({
            restaurantId,
            isActive: true,
            "linkedMenuItems.0": { $exists: true }
        });

        const deductionResults = [];

        for (const inv of inventoryItems) {
            let invCurrentStock = Number(inv.currentStock) || 0;

            for (const link of inv.linkedMenuItems) {
                const foodKey = String(link.foodId);
                const qtyOrdered = Number(orderedMap[foodKey] || 0);
                if (!qtyOrdered || Number(link.quantityPerOrder) <= 0) continue;

                const linkQtyPerOrder = Number(link.quantityPerOrder);
                const qtyToDeduct = Number((qtyOrdered * linkQtyPerOrder).toFixed(4));
                const stockBefore = invCurrentStock;
                const stockAfter = Math.max(0, stockBefore - qtyToDeduct);

                invCurrentStock = stockAfter;

                await inventoryModel.findByIdAndUpdate(inv._id, {
                    currentStock: invCurrentStock,
                    $push: {
                        deductionLog: {
                            $each: [{
                                orderId: orderId || "unknown",
                                foodId: foodKey,
                                foodName: orderItems.find(oi => String(oi._id || oi.foodId) === foodKey)?.name || "",
                                qtyOrdered,
                                qtyDeducted: qtyToDeduct,
                                stockBefore,
                                stockAfter,
                                date: new Date()
                            }],
                            $slice: -100
                        }
                    }
                });

                deductionResults.push({
                    inventoryItem: inv.itemName,
                    inventoryId: inv._id,
                    foodId: foodKey,
                    qtyOrdered,
                    qtyDeducted: qtyToDeduct,
                    stockBefore,
                    stockAfter,
                    linkQuantityPerOrder: linkQtyPerOrder,
                    success: true
                });
            }
        }

        console.log(`[inventory] Deducted ${deductionResults.length} entries for order ${orderId || "?"}`);
        return { success: true, message: "Inventory deduction completed", deductions: deductionResults };
    } catch (error) {
        console.error("Error deducting inventory:", error);
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

export {
    getInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    bulkDeleteInventoryItems,
    bulkUpdateInventoryItems,
    updateStockLevel,
    getInventoryAlerts,
    getAIInsights,
    deductInventoryForOrder,
    linkMenuItem,
    unlinkMenuItem,
    getRestaurantFoods,
    getDeductionLog,
    previewInventoryDeduction
};