import jwt from "jsonwebtoken";

const restaurantAuth = (req, res, next) => {

  try {
    // Accept both Authorization: Bearer <token> and token header
    let token = req.headers.token;
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Restaurant token missing"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "restaurant") {
      return res.status(403).json({
        success: false,
        message: "Invalid restaurant token"
      });
    }

    req.restaurantId = decoded.id;

    next();

  } catch (err) {
    console.error("Restaurant auth error:", err);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired restaurant token"
    });
  }

}

export default restaurantAuth;
