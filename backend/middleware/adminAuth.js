import jwt from "jsonwebtoken";

const adminAuth = (req, res, next) => {

  try {

    const authHeader = req.headers.authorization;
    console.log("[adminAuth] Auth header:", authHeader ? "Present" : "Missing");
    console.log("[adminAuth] Request URL:", req.originalUrl);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[adminAuth] ❌ Token missing or invalid format");
      return res.json({
        success:false,
        message:"Admin token missing"
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("[adminAuth] Token length:", token.length);

    // Try ADMIN_JWT_SECRET first (superadmin), then fall back to JWT_SECRET (restaurantadmin)
    let decoded;
    try {
      console.log("[adminAuth] Trying ADMIN_JWT_SECRET");
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
      console.log("[adminAuth] ✅ Admin token verified");
    } catch (err) {
      console.log("[adminAuth] ADMIN_JWT_SECRET failed, trying JWT_SECRET");
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("[adminAuth] ✅ Restaurant admin token verified");
      } catch (err2) {
        console.log("[adminAuth] ❌ Both tokens failed:", err2.message);
        throw err2;
      }
    }

    req.admin = decoded;
    console.log("[adminAuth] ✅ Authentication successful");

    next();

  } catch (error) {
    console.log("[adminAuth] ❌ Authentication error:", error.message);

    res.json({
      success:false,
      message:"Invalid admin token"
    });

  }

};

export default adminAuth;