const express = require("express");
const AuditLog = require("../models/AuditLog");
const { authenticateToken, requireAdmin } = require("../utils/authMiddleware");

const router = express.Router();

// Enforce admin-only access on /admin routes
router.use("/admin", authenticateToken, requireAdmin);

/**
 * GET /api/admin/audit-logs
 * Paginated query for audit logs with multi-field filtering
 */
router.get("/admin/audit-logs", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      status,
      userEmail,
      search,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (action && action !== "all") {
      filter.action = action;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (userEmail) {
      filter.userEmail = { $regex: userEmail, $options: "i" };
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
        { resourceType: { $regex: search, $options: "i" } },
        { resourceId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Fetch audit logs error:", error);
    return res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

/**
 * GET /api/admin/audit-logs/stats
 * Overview analytics for user activity
 */
router.get("/admin/audit-logs/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalLogs, todayLogs, topActions, activeUsers] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: today } }),
      AuditLog.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      AuditLog.aggregate([
        { $match: { userEmail: { $ne: "Guest/Anonymous" } } },
        { $group: { _id: "$userEmail", name: { $first: "$userName" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    return res.json({
      totalLogs,
      todayLogs,
      topActions,
      activeUsers,
    });
  } catch (error) {
    console.error("Audit stats error:", error);
    return res.status(500).json({ error: "Failed to fetch audit statistics" });
  }
});

/**
 * GET /api/admin/audit-logs/export
 * Export recent logs as JSON array
 */
router.get("/admin/audit-logs/export", async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${Date.now()}.json`);
    res.setHeader("Content-Type", "application/json");
    return res.json(logs);
  } catch (error) {
    console.error("Export audit logs error:", error);
    return res.status(500).json({ error: "Export failed" });
  }
});

module.exports = router;
