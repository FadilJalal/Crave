import foodModel from "../models/foodModel.js";
import fs from "fs";

// ===============================
// ADD FOOD
// POST /api/food/add
// ===============================
const addFood = async (req, res) => {

  try {

    const image_filename = req.file.filename;

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

    let foods;

    if(req.admin.role === "restaurantadmin"){

        foods = await foodModel.find({
          restaurantId:req.admin.restaurantId
        });

    }

    else{

        foods = await foodModel.find({})
        .populate("restaurantId","name");

    }

    res.json({
      success:true,
      data:foods
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