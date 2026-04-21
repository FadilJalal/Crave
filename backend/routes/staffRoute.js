import express from "express";
import restaurantAuth from "../middleware/restaurantAuth.js";
import staffModel from "../models/staffModel.js";

const router = express.Router();

// Get all staff for a restaurant
router.get("/list", restaurantAuth, async (req, res) => {
  try {
    const staff = await staffModel.find({ restaurantId: req.restaurantId }).sort({ joinedAt: -1 });
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error("[staff/list]", error);
    res.json({ success: false, message: "Failed to fetch staff" });
  }
});

// Add new staff
router.post("/add", restaurantAuth, async (req, res) => {
  try {
    const { name, role, hourlyWage, phone, status } = req.body;
    
    if (!name || !role || !hourlyWage) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    const newStaff = new staffModel({
      name,
      role,
      hourlyWage: Number(hourlyWage) || 0,
      phone: phone || "",
      status: status || "Active",
      restaurantId: req.restaurantId
    });

    await newStaff.save();
    res.json({ success: true, message: "Staff added successfully", data: newStaff });
  } catch (error) {
    console.error("[staff/add]", error);
    res.json({ success: false, message: "Failed to add staff" });
  }
});

// Update staff
router.put("/edit/:id", restaurantAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, hourlyWage, phone, status } = req.body;

    const updated = await staffModel.findOneAndUpdate(
      { _id: id, restaurantId: req.restaurantId },
      { name, role, hourlyWage: Number(hourlyWage) || 0, phone, status },
      { new: true }
    );

    if (!updated) {
      return res.json({ success: false, message: "Staff not found" });
    }

    res.json({ success: true, message: "Staff updated successfully", data: updated });
  } catch (error) {
    console.error("[staff/edit]", error);
    res.json({ success: false, message: "Failed to update staff" });
  }
});

// Delete staff
router.delete("/remove/:id", restaurantAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Hard delete for now, or could change status to Terminated
    const deleted = await staffModel.findOneAndDelete({ _id: id, restaurantId: req.restaurantId });
    
    if (!deleted) {
      return res.json({ success: false, message: "Staff not found" });
    }

    res.json({ success: true, message: "Staff removed successfully" });
  } catch (error) {
    console.error("[staff/remove]", error);
    res.json({ success: false, message: "Failed to remove staff" });
  }
});

export default router;
