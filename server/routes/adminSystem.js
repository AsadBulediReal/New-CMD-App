const express = require("express");
const mongoose = require("mongoose");
const StoredFile = require("../models/StoredFile");
const FileChunk = require("../models/FileChunk");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const DeletionRequest = require("../models/DeletionRequest");
const Notification = require("../models/Notification");
const { authenticateToken, requireAdmin } = require("../utils/authMiddleware");
const { logUserActivity } = require("../utils/logger");
const { verifySmtpConnection } = require("../utils/mailer");

const router = express.Router();
router.use("/admin", authenticateToken, requireAdmin);

/**
 * GET /api/admin/system-health
 * Real-time system diagnostics and database health metrics
 */
router.get("/admin/system-health", async (req, res) => {
  try {
    const startTime = Date.now();
    await mongoose.connection.db.admin().ping();
    const pingLatencyMs = Date.now() - startTime;

    const [
      totalFiles,
      totalChunks,
      totalUsers,
      totalAuditLogs,
      totalDeletionRequests,
      totalNotifications,
      smtpStatus,
    ] = await Promise.all([
      StoredFile.countDocuments(),
      FileChunk.countDocuments(),
      User.countDocuments(),
      AuditLog.countDocuments(),
      DeletionRequest.countDocuments(),
      Notification.countDocuments(),
      verifySmtpConnection(),
    ]);

    const mem = process.memoryUsage();

    return res.json({
      database: {
        status: mongoose.connection.readyState === 1 ? "Connected" : "Degraded",
        dbName: mongoose.connection.name || "admin",
        pingLatencyMs,
        counts: {
          files: totalFiles,
          chunks: totalChunks,
          users: totalUsers,
          auditLogs: totalAuditLogs,
          deletionRequests: totalDeletionRequests,
          notifications: totalNotifications,
        },
      },
      server: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          rssMb: Math.round(mem.rss / 1024 / 1024),
          heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
          heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        },
      },
      smtp: smtpStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("System health check error:", error);
    return res.status(500).json({ error: "Failed to query system health" });
  }
});

/**
 * GET /api/admin/database/backup
 * Download full database snapshot export
 */
router.get("/admin/database/backup", async (req, res) => {
  try {
    const [files, users, deletionRequests, auditLogs, notifications] = await Promise.all([
      StoredFile.find().select("-rows -sheets.rows").lean(),
      User.find().select("-password -resetPasswordToken -resetPasswordExpires").lean(),
      DeletionRequest.find().lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(1000).lean(),
      Notification.find().sort({ createdAt: -1 }).limit(500).lean(),
    ]);

    const backupData = {
      app: "CMD Finance Portal",
      version: "2.0.0",
      exportDate: new Date().toISOString(),
      exportedBy: {
        userId: req.user._id,
        email: req.user.email,
        name: req.user.name,
      },
      collections: {
        filesCount: files.length,
        usersCount: users.length,
        deletionRequestsCount: deletionRequests.length,
        auditLogsCount: auditLogs.length,
        notificationsCount: notifications.length,
      },
      data: {
        files,
        users,
        deletionRequests,
        auditLogs,
        notifications,
      },
    };

    await logUserActivity({
      req,
      action: "EXPORT_DATABASE_BACKUP",
      resourceType: "System",
      details: {
        filesCount: files.length,
        usersCount: users.length,
      },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `cmd-finance-backup-${timestamp}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    console.error("Database backup export error:", error);
    return res.status(500).json({ error: "Failed to generate database backup" });
  }
});

module.exports = router;
