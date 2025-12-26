import jwt from "jsonwebtoken";

// authenticate token and load user based on role
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    // verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // find user based on role
    const { userId, role } = decoded;
    let user;

    if (role === "admin") {
      const Admin = (await import("../models/Admin.js")).default;
      user = await Admin.findById(userId);
    } else if (role === "client") {
      const Client = (await import("../models/Client.js")).default;
      user = await Client.findById(userId);
    } else if (role === "technician") {
      const Technician = (await import("../models/Technician.js")).default;
      user = await Technician.findById(userId);
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive user",
      });
    }

    req.user = { id: user._id, role, ...user.toObject() };
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(403).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// alias for authenticate token
export const authenticate = authenticateToken;

// authenticate and require admin role
export const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {});

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Admin authentication failed",
    });
  }
};

// require specific role(s) for access
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }
    next();
  };
};
