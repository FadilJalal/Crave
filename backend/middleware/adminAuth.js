import jwt from "jsonwebtoken";

const adminAuth = (req, res, next) => {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({
        success:false,
        message:"Admin token missing"
      });
    }

    const token = authHeader.split(" ")[1];

    // Try ADMIN_JWT_SECRET first (superadmin), then fall back to JWT_SECRET (restaurantadmin)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    } catch {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    }

    req.admin = decoded;

    next();

  } catch (error) {

    res.json({
      success:false,
      message:"Invalid admin token"
    });

  }

};

export default adminAuth;