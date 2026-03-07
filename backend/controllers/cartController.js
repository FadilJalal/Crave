import userModel from "../models/userModel.js";

const addToCart = async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.json({ success: false, message: "itemId is required" });

    const userData = await userModel.findById(req.body.userId);
    if (!userData) return res.json({ success: false, message: "User not found" });

    const cartData = userData.cartData || {};
    cartData[itemId] = (cartData[itemId] || 0) + 1;

    await userModel.findByIdAndUpdate(req.body.userId, { cartData });
    res.json({ success: true, message: "Added To Cart" });
  } catch (error) {
    console.error("[addToCart]", error.message);
    res.json({ success: false, message: "Error adding to cart" });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.json({ success: false, message: "itemId is required" });

    const userData = await userModel.findById(req.body.userId);
    if (!userData) return res.json({ success: false, message: "User not found" });

    const cartData = userData.cartData || {};
    if (cartData[itemId] && cartData[itemId] > 0) {
      cartData[itemId] -= 1;
      if (cartData[itemId] === 0) delete cartData[itemId];
    }

    await userModel.findByIdAndUpdate(req.body.userId, { cartData });
    res.json({ success: true, message: "Removed From Cart" });
  } catch (error) {
    console.error("[removeFromCart]", error.message);
    res.json({ success: false, message: "Error removing from cart" });
  }
};

const getCart = async (req, res) => {
  try {
    const userData = await userModel.findById(req.body.userId);
    if (!userData) return res.json({ success: false, message: "User not found" });
    res.json({ success: true, cartData: userData.cartData || {} });
  } catch (error) {
    console.error("[getCart]", error.message);
    res.json({ success: false, message: "Error fetching cart" });
  }
};

export { addToCart, removeFromCart, getCart };
