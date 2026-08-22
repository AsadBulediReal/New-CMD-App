const express = require("express");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { authenticateToken, requireAdmin } = require("../utils/authMiddleware");
const {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
} = require("../utils/mailer");

const router = express.Router();

// Apply auth & admin guard to all routes in this router
router.use(authenticateToken, requireAdmin);

/**
 * GET /api/admin/users
 * Query and filter user accounts
 */
router.get("/admin/users", async (req, res) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -resetPasswordToken -resetPasswordExpires")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return res.json({
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Admin list users error:", error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * POST /api/admin/users/:id/approve
 * Approve a pending user account
 */
router.post("/admin/users/:id/approve", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.status = "active";
    user.approvedAt = new Date();
    user.rejectionReason = "";
    await user.save();

    // Send confirmation email to user
    sendAccountApprovedEmail(user).catch((err) =>
      console.warn("Approval email error:", err.message)
    );

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      action: "APPROVE_USER",
      resourceType: "User",
      resourceId: user._id.toString(),
      details: { targetEmail: user.email, targetName: user.name },
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.json({
      message: "User account approved successfully",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Approve user error:", error);
    return res.status(500).json({ error: "Failed to approve user" });
  }
});

/**
 * POST /api/admin/users/:id/reject
 * Reject a user account with a reason and dispatch email
 */
router.post("/admin/users/:id/reject", async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const reason = rejectionReason && rejectionReason.trim()
      ? rejectionReason.trim()
      : "Application did not meet registration criteria.";

    user.status = "rejected";
    user.rejectionReason = reason;
    await user.save();

    // Send rejection email with the specific reason
    sendAccountRejectedEmail(user, reason).catch((err) =>
      console.warn("Rejection email error:", err.message)
    );

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      action: "REJECT_USER",
      resourceType: "User",
      resourceId: user._id.toString(),
      details: { targetEmail: user.email, targetName: user.name, reason },
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.json({
      message: "User registration rejected and notification dispatched",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Reject user error:", error);
    return res.status(500).json({ error: "Failed to reject user" });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Modify user role or status (e.g. suspend / unsuspend)
 */
router.patch("/admin/users/:id/role", async (req, res) => {
  try {
    const { role, status } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (role && ["admin", "user"].includes(role)) {
      user.role = role;
    }

    if (status && ["active", "suspended", "pending", "rejected"].includes(status)) {
      user.status = status;
    }

    await user.save();

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      action: "UPDATE_USER_PERMISSIONS",
      resourceType: "User",
      resourceId: user._id.toString(),
      details: { targetEmail: user.email, newRole: user.role, newStatus: user.status },
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.json({
      message: "User permissions updated",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Update permissions error:", error);
    return res.status(500).json({ error: "Failed to update user permissions" });
  }
});

module.exports = router;
