const express = require("express");
const Notification = require("../models/Notification");
const { authenticateToken } = require("../utils/authMiddleware");

const router = express.Router();

/**
 * GET /api/notifications
 * Fetch notifications for current user (or admin broadcasts)
 */
router.get("/notifications", authenticateToken, async (req, res) => {
  try {
    const userFilter = [
      { recipientId: req.user._id },
      ...(req.user.role === "admin" ? [{ recipientRole: "admin" }] : []),
    ];

    const notifications = await Notification.find({ $or: userFilter })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await Notification.countDocuments({
      $or: userFilter,
      read: false,
    });

    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch("/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notification.read = true;
    await notification.save();

    return res.json({ message: "Notification marked as read" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update notification" });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications for current user as read
 */
router.post("/notifications/read-all", authenticateToken, async (req, res) => {
  try {
    const userFilter = [
      { recipientId: req.user._id },
      ...(req.user.role === "admin" ? [{ recipientRole: "admin" }] : []),
    ];

    await Notification.updateMany({ $or: userFilter, read: false }, { $set: { read: true } });

    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update notifications" });
  }
});

/**
 * DELETE /api/notifications/:id
 * Dismiss a notification
 */
router.delete("/notifications/:id", authenticateToken, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    return res.json({ message: "Notification dismissed" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete notification" });
  }
});

module.exports = router;
