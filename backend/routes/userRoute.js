import express from 'express';
import { loginUser, registerUser, getProfile, updateProfile, getAddresses, addAddress, deleteAddress, setDefaultAddress } from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';
const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/profile", authMiddleware, getProfile);
userRouter.put("/profile", authMiddleware, updateProfile);

// Address management
userRouter.get("/addresses", authMiddleware, getAddresses);
userRouter.post("/addresses", authMiddleware, addAddress);
userRouter.delete("/addresses", authMiddleware, deleteAddress);
userRouter.post("/addresses/default", authMiddleware, setDefaultAddress);

export default userRouter;