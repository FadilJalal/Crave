import userModel from "../models/userModel.js";

// Fetch wallet balance and history
const getWallet = async (req, res) => {
    try {
        const user = await userModel.findById(req.body.userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            balance: user.walletBalance || 0,
            history: user.walletHistory || []
        });
    } catch (error) {
        console.error("Error fetching wallet:", error);
        res.json({ success: false, message: "Error fetching wallet" });
    }
};

export { getWallet };
