import foodModel from "../models/foodModel.js";
import fs from "fs";

// ===============================
// ADD FOOD
// POST /api/food/add
// ===============================
const addFood = async (req, res) => {

  try {

    const image_filename = req.file.filename;

    const escapedName = req.body.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await foodModel.findOne({
      restaurantId: req.admin.restaurantId,
      name: { $regex: new RegExp(`^${escapedName}$`, "i") }
    });

    if (existing) {
      existing.description = req.body.description;
      existing.price = Number(req.body.price);
      existing.image = image_filename;
      existing.category = req.body.category;
      await existing.save();
      return res.json({ success: true, message: "Food updated", data: existing });
    }

    const food = new foodModel({

      name:req.body.name,
      description:req.body.description,
      price:Number(req.body.price),
      image:image_filename,
      category:req.body.category,

      // Restaurant admin auto assignment
      restaurantId:req.admin.restaurantId

    });

    await food.save();

    res.json({
      success:true,
      message:"Food Added",
      data: food
    });

  }

  catch(error){

    console.log(error);

    res.json({
      success:false,
      message:"Error adding food"
    });

  }

};

// ===============================
// LIST FOOD
// GET /api/food/list
// ===============================
const listFood = async (req, res) => {

  try {

    // Get pagination params from query (e.g., ?page=1&limit=50)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50); // Cap at 100
    const skip = (page - 1) * limit;

    let foods, total;

    if(req.admin.role === "restaurantadmin"){

        total = await foodModel.countDocuments({
          restaurantId:req.admin.restaurantId
        });

        foods = await foodModel.find({
          restaurantId:req.admin.restaurantId
        })
        .skip(skip)
        .limit(limit)
        .lean();

    }

    else{

        total = await foodModel.countDocuments({});

        foods = await foodModel.find({})
        .populate("restaurantId","name")
        .skip(skip)
        .limit(limit)
        .lean();

    }

    res.json({
      success:true,
      data:foods,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  }

  catch(error){

    console.log(error);

    res.json({
      success:false,
      message:"Error listing foods"
    });

  }

};


// ===============================
// REMOVE FOOD
// POST /api/food/remove
// ===============================
const removeFood = async (req, res) => {

  try {

    const food = await foodModel.findById(req.body.id);

    if (!food) {
      return res.json({
        success:false,
        message:"Food not found"
      });
    }

    // delete image file
    try{
      fs.unlinkSync(`uploads/${food.image}`);
    }
    catch(e){}

    await foodModel.findByIdAndDelete(req.body.id);

    res.json({
      success:true,
      message:"Food Removed"
    });

  } catch (error) {

    console.log(error);

    res.json({
      success:false,
      message:"Error removing food"
    });

  }

};


// IMPORTANT EXPORTS
export { addFood, listFood, removeFood };