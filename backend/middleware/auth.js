import jwt from 'jsonwebtoken';

const authMiddleware = async (req, res, next) => {
    const { token } = req.headers;
    if (!token) {
        return res.status(401).json({success:false,message:'Not Authorized Login Again'});
    }
    if (!process.env.JWT_SECRET) {
        console.error("[Auth] JWT_SECRET not set");
        return res.status(500).json({success:false,message:'Server configuration error'});
    }
    try {
        const token_decode =  jwt.verify(token, process.env.JWT_SECRET);
        req.body.userId = token_decode.id;
        req.userId = token_decode.id; // Support GET requests
        next();
    } catch (error) {
        return res.status(401).json({success:false,message:error.message});
    }
}

export default authMiddleware;