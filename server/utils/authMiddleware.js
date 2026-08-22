const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "cmd_app_jwt_secret_secure_key_2026";

/**
 * Middleware to authenticate requests via Bearer JWT token
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: "User account no longer exists" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ error: "Account has been suspended" });
    }

    if (user.status === "pending") {
      return res.status(403).json({ error: "Account is pending admin approval" });
    }

    if (user.status === "rejected") {
      return res.status(403).json({ 
        error: "Account registration was rejected",
        rejectionReason: user.rejectionReason 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please log in again" });
    }
    return res.status(401).json({ error: "Invalid authentication token" });
  }
}

/**
 * Middleware to restrict endpoint access to Administrator role only
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Administrator privileges required" });
  }
  next();
}

/**
 * Optional authentication: attaches user if token present, does not fail if missing
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (user && user.status === "active") {
      req.user = user;
    }
  } catch {
    // Ignore invalid optional tokens
  }
  next();
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireAdmin,
  optionalAuth,
};
