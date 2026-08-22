const express = require("express");
const DeletionRequest = require("../models/DeletionRequest");
const StoredFile = require("../models/StoredFile");
const FileChunk = require("../models/FileChunk");
const Notification = require("../models/Notification");
const { authenticateToken, requireAdmin } = require("../utils/authMiddleware");
const { logUserActivity } = require("../utils/logger");
const { sendDeletionStatusEmail } = require("../utils/mailer");

const router = express.Router();

// Enforce admin-only access on /admin routes
router.use("/admin", authenticateToken, requireAdmin);

/**
 * GET /api/admin/deletion-requests
 * Query and filter deletion requests
 */
router.get("/admin/deletion-requests", async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const [requests, total] = await Promise.all([
      DeletionRequest.find(filter)
        .populate("requestedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DeletionRequest.countDocuments(filter),
    ]);

    return res.json({
      requests,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Fetch deletion requests error:", error);
    return res.status(500).json({ error: "Failed to fetch deletion requests" });
  }
});

/**
 * POST /api/admin/deletion-requests/:id/approve
 * Permanently delete the resource and approve request
 */
router.post("/admin/deletion-requests/:id/approve", async (req, res) => {
  try {
    const { adminNote = "" } = req.body;
    const delReq = await DeletionRequest.findById(req.params.id);

    if (!delReq) {
      return res.status(404).json({ error: "Deletion request not found" });
    }

    if (delReq.status !== "pending") {
      return res.status(400).json({ error: `Request is already ${delReq.status}` });
    }

    // 1. Permanently delete the target file and its chunks
    if (delReq.targetModel === "StoredFile") {
      await StoredFile.findByIdAndDelete(delReq.targetId);
      await FileChunk.deleteMany({ fileId: delReq.targetId });
    }

    // 2. Update deletion request record
    delReq.status = "approved";
    delReq.adminNote = adminNote;
    delReq.reviewedBy = req.user._id;
    delReq.reviewedAt = new Date();
    await delReq.save();

    // 3. Notify requester via email
    if (delReq.requestedByEmail) {
      sendDeletionStatusEmail(
        delReq.requestedByEmail,
        delReq.targetName,
        true,
        adminNote
      ).catch((err) => console.warn("Deletion approval email error:", err.message));
    }

    // Mark pending deletion request notifications as completed
    await Notification.updateMany(
      {
        $or: [
          { relatedId: delReq._id },
          { type: "deletion_requested", message: { $regex: delReq.targetName, $options: "i" } },
        ],
        isCompleted: false,
      },
      { $set: { isCompleted: true, completedAt: new Date() } }
    ).catch(() => {});

    const { createNotification } = require("../utils/notify");
    createNotification({
      recipientId: delReq.requestedBy,
      title: "Deletion Approved",
      message: `Your request to delete "${delReq.targetName}" was approved.`,
      type: "deletion_approved",
      link: "/saved-files",
      relatedId: delReq._id,
      isCompleted: true,
    }).catch(() => {});

    // 4. Record audit log
    await logUserActivity({
      req,
      action: "APPROVE_DELETION",
      resourceType: delReq.targetModel,
      resourceId: delReq.targetId.toString(),
      details: { targetName: delReq.targetName, requestedBy: delReq.requestedByEmail, adminNote },
      status: "SUCCESS",
    });

    return res.json({
      message: "Deletion approved and resource permanently removed",
      request: delReq,
    });
  } catch (error) {
    console.error("Approve deletion error:", error);
    return res.status(500).json({ error: "Failed to approve deletion" });
  }
});

/**
 * POST /api/admin/deletion-requests/:id/reject
 * Reject deletion and restore file to active state
 */
router.post("/admin/deletion-requests/:id/reject", async (req, res) => {
  try {
    const { adminNote = "" } = req.body;
    const delReq = await DeletionRequest.findById(req.params.id);

    if (!delReq) {
      return res.status(404).json({ error: "Deletion request not found" });
    }

    if (delReq.status !== "pending") {
      return res.status(400).json({ error: `Request is already ${delReq.status}` });
    }

    // 1. Restore the target file's pending flag
    if (delReq.targetModel === "StoredFile") {
      await StoredFile.findByIdAndUpdate(delReq.targetId, {
        isPendingDeletion: false,
        deletionRequestId: null,
      });
    }

    // 2. Update deletion request record
    delReq.status = "rejected";
    delReq.adminNote = adminNote || "Deletion request was denied by administrator.";
    delReq.reviewedBy = req.user._id;
    delReq.reviewedAt = new Date();
    await delReq.save();

    // 3. Notify requester via email
    if (delReq.requestedByEmail) {
      sendDeletionStatusEmail(
        delReq.requestedByEmail,
        delReq.targetName,
        false,
        delReq.adminNote
      ).catch((err) => console.warn("Deletion rejection email error:", err.message));
    }

    // Mark pending deletion request notifications as completed
    await Notification.updateMany(
      {
        $or: [
          { relatedId: delReq._id },
          { type: "deletion_requested", message: { $regex: delReq.targetName, $options: "i" } },
        ],
        isCompleted: false,
      },
      { $set: { isCompleted: true, completedAt: new Date() } }
    ).catch(() => {});

    createNotification({
      recipientId: delReq.requestedBy,
      title: "Deletion Request Rejected",
      message: `Your request to delete "${delReq.targetName}" was rejected: ${delReq.adminNote}`,
      type: "deletion_rejected",
      link: "/saved-files",
      relatedId: delReq._id,
      isCompleted: true,
    }).catch(() => {});

    // 4. Record audit log
    await logUserActivity({
      req,
      action: "REJECT_DELETION",
      resourceType: delReq.targetModel,
      resourceId: delReq.targetId.toString(),
      details: { targetName: delReq.targetName, requestedBy: delReq.requestedByEmail, adminNote: delReq.adminNote },
      status: "SUCCESS",
    });

    return res.json({
      message: "Deletion request rejected. Resource retained.",
      request: delReq,
    });
  } catch (error) {
    console.error("Reject deletion error:", error);
    return res.status(500).json({ error: "Failed to reject deletion" });
  }
});

module.exports = router;
