const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { JWT_SECRET, authenticateToken } = require("../utils/authMiddleware");
const { sendAdminNewUserAlert } = require("../utils/mailer");
const { verifyGoogleToken } = require("../utils/googleAuth");
const { createNotification } = require("../utils/notify");

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user. First user or ADMIN_EMAIL is auto-promoted to active admin.
 */
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const totalUsers = await User.countDocuments();
    const isConfiguredAdmin =
      process.env.ADMIN_EMAIL && normalizedEmail === process.env.ADMIN_EMAIL.trim().toLowerCase();
    const isFirstUser = totalUsers === 0 || isConfiguredAdmin;

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: isFirstUser ? "admin" : "user",
      status: isFirstUser ? "active" : "pending",
      approvedAt: isFirstUser ? new Date() : null,
    });

    await newUser.save();

    await AuditLog.create({
      userId: newUser._id,
      userEmail: newUser.email,
      userName: newUser.name,
      userRole: newUser.role,
      action: "REGISTER",
      resourceType: "User",
      resourceId: newUser._id.toString(),
      details: { role: newUser.role, status: newUser.status, isFirstUser },
      ipAddress: req.ip,
    });

    if (isFirstUser) {
      const token = jwt.sign(
        { userId: newUser._id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.status(201).json({
        message: "Administrator account initialized successfully",
        token,
        user: newUser.toSafeObject(),
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@usindh.edu.pk";
    sendAdminNewUserAlert(adminEmail, newUser).catch((err) =>
      console.warn("Admin alert email error:", err.message)
    );

    createNotification({
      recipientRole: "admin",
      title: "New User Registration",
      message: `${newUser.name} (${newUser.email}) has registered and is pending approval.`,
      type: "user_registered",
      link: "/admin?tab=users&status=pending",
      relatedId: newUser._id,
      isCompleted: false,
    }).catch(() => {});

    return res.status(201).json({
      message: "Registration submitted successfully. Your account is pending administrator approval.",
      status: "pending",
      user: { name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration failed. Please try again" });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user credentials and return JWT if active.
 */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await AuditLog.create({
        userEmail: normalizedEmail,
        userName: user.name,
        action: "LOGIN_FAILED",
        resourceType: "Auth",
        details: { reason: "Incorrect password" },
        ipAddress: req.ip,
        status: "FAILED",
      });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.status === "pending") {
      return res.status(403).json({
        error: "Your account is pending administrator approval. You will receive an email once approved.",
        status: "pending",
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        error: "Your account registration was rejected by the administrator.",
        status: "rejected",
        rejectionReason: user.rejectionReason || "No specific reason provided.",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        error: "Your account has been suspended by the administrator.",
        status: "suspended",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    await AuditLog.create({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      action: "LOGIN",
      resourceType: "Auth",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status: "SUCCESS",
    });

    return res.json({
      message: "Login successful",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login process failed" });
  }
});

/**
 * POST /api/auth/google
 * Verify Google credential and log in or register user.
 */
router.post("/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    const { email, name, googleId, avatar } = await verifyGoogleToken(credential);

    let user = await User.findOne({
      $or: [{ email }, { googleId }],
    });

    if (user) {
      if (!user.googleId) user.googleId = googleId;
      if (!user.avatar && avatar) user.avatar = avatar;

      if (user.status === "pending") {
        return res.status(403).json({
          error: "Your account is pending administrator approval. You will receive an email once approved.",
          status: "pending",
        });
      }

      if (user.status === "rejected") {
        return res.status(403).json({
          error: "Your account registration was rejected by the administrator.",
          status: "rejected",
          rejectionReason: user.rejectionReason || "No specific reason provided.",
        });
      }

      if (user.status === "suspended") {
        return res.status(403).json({
          error: "Your account has been suspended by the administrator.",
          status: "suspended",
        });
      }

      user.lastLoginAt = new Date();
      await user.save();

      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      await AuditLog.create({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        action: "LOGIN",
        resourceType: "Auth",
        details: { authProvider: "google" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        status: "SUCCESS",
      });

      return res.json({
        message: "Google login successful",
        token,
        user: user.toSafeObject(),
      });
    }

    const totalUsers = await User.countDocuments();
    const isConfiguredAdmin =
      process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.trim().toLowerCase();
    const isFirstUser = totalUsers === 0 || isConfiguredAdmin;

    const newUser = new User({
      name,
      email,
      authProvider: "google",
      googleId,
      avatar: avatar || null,
      role: isFirstUser ? "admin" : "user",
      status: isFirstUser ? "active" : "pending",
      approvedAt: isFirstUser ? new Date() : null,
      lastLoginAt: isFirstUser ? new Date() : null,
    });

    await newUser.save();

    await AuditLog.create({
      userId: newUser._id,
      userEmail: newUser.email,
      userName: newUser.name,
      userRole: newUser.role,
      action: "REGISTER",
      resourceType: "User",
      resourceId: newUser._id.toString(),
      details: { authProvider: "google", role: newUser.role, status: newUser.status, isFirstUser },
      ipAddress: req.ip,
    });

    if (isFirstUser) {
      const token = jwt.sign(
        { userId: newUser._id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.status(201).json({
        message: "Administrator account initialized successfully via Google",
        token,
        user: newUser.toSafeObject(),
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@usindh.edu.pk";
    sendAdminNewUserAlert(adminEmail, newUser).catch((err) =>
      console.warn("Admin alert email error:", err.message)
    );

    createNotification({
      recipientRole: "admin",
      title: "New Google User Registration",
      message: `${newUser.name} (${newUser.email}) registered via Google and is pending approval.`,
      type: "user_registered",
      link: "/admin?tab=users&status=pending",
      relatedId: newUser._id,
      isCompleted: false,
    }).catch(() => {});

    return res.status(201).json({
      message: "Registration submitted successfully. Your account is pending administrator approval.",
      status: "pending",
      user: { name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message || "Google authentication failed" });
  }
});

/**
 * GET /api/auth/me
 * Fetch current authenticated user profile
 */
router.get("/auth/me", authenticateToken, async (req, res) => {
  try {
    return res.json({ user: req.user.toSafeObject() });
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve user profile" });
  }
});

module.exports = router;
