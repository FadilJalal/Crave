import express from 'express';
import { addToCart, getCart, removeFromCart, updateQuantity } from '../controllers/cartController.js';
import authMiddleware from '../middleware/auth.js';

const cartRouter = express.Router();

cartRouter.post("/get",authMiddleware,getCart);
cartRouter.post("/add",authMiddleware,addToCart);
cartRouter.post("/remove",authMiddleware,removeFromCart);
cartRouter.post("/update-quantity",authMiddleware,updateQuantity);

export default cartRouter;