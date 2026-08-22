const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { authenticateToken } = require("../utils/authMiddleware");
const { sendPasswordResetEmail } = require("../utils/mailer");

const router = express.Router();

/**
 * POST /api/auth/forgot-password
 * Send password reset link to user email
 */
router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.json({ message: "If this email is registered, a password reset link has been dispatched." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    sendPasswordResetEmail(user, resetToken).catch((err) =>
      console.warn("Password reset email error:", err.message)
    );

    return res.json({ message: "If this email is registered, a password reset link has been dispatched." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Password reset request failed" });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post("/auth/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: "Email, token, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired password reset link" });
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      action: "RESET_PASSWORD",
      resourceType: "Auth",
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.json({ message: "Password has been successfully updated. You may now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
});

/**
 * PATCH /api/auth/profile
 * Update user display name
 */
router.patch("/auth/profile", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    req.user.name = name.trim();
    await req.user.save();

    return res.json({ message: "Profile updated successfully", user: req.user.toSafeObject() });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for currently logged-in user
 */
router.post("/auth/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required" });
    }

    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    req.user.password = newPassword;
    await req.user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to change password" });
  }
});

module.exports = router;
